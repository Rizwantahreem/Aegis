"""Metrics, tester, and policy endpoints."""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import AgentSession, ConversationLog, SecurityEvent, Policy
from ..schemas import DashboardMetrics, SecurityEventOut, ConversationLogOut, PolicyOut, PolicyCreate, TestRunRequest
from ..services.lobster_trap import inspect_prompt, should_block, seed_policies
from ..services.gemini import generate_response, get_agent_name
from ..services.cost import calculate_cost
from ..data.test_prompts import get_test_prompts
from .sse import broadcast_event

router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/metrics/dashboard", response_model=DashboardMetrics)
def dashboard_metrics(db: Session = Depends(get_db)):
    total_sessions = db.query(func.count(AgentSession.id)).scalar() or 0
    active_sessions = db.query(func.count(AgentSession.id)).filter(AgentSession.status == "active").scalar() or 0
    total_interactions = db.query(func.count(ConversationLog.id)).scalar() or 0
    total_violations = db.query(func.count(SecurityEvent.id)).scalar() or 0
    total_cost = db.query(func.sum(ConversationLog.cost_usd)).scalar() or 0.0
    blocked = db.query(func.count(ConversationLog.id)).filter(ConversationLog.blocked == True).scalar() or 0
    violation_rate = (total_violations / total_interactions * 100) if total_interactions > 0 else 0.0

    recent_events = db.query(SecurityEvent).order_by(SecurityEvent.detected_at.desc()).limit(10).all()
    recent_logs = db.query(ConversationLog).order_by(ConversationLog.timestamp.desc()).limit(10).all()

    return DashboardMetrics(
        total_sessions=total_sessions,
        active_sessions=active_sessions,
        total_interactions=total_interactions,
        total_violations=total_violations,
        total_cost=round(total_cost, 4),
        blocked_attacks=blocked,
        violation_rate=round(violation_rate, 1),
        recent_events=[SecurityEventOut.model_validate(e) for e in recent_events],
        recent_logs=[ConversationLogOut.model_validate(l) for l in recent_logs],
    )


@router.get("/policies", response_model=list[PolicyOut])
def list_policies(db: Session = Depends(get_db)):
    return db.query(Policy).all()


@router.post("/policies", response_model=PolicyOut)
def create_policy(policy: PolicyCreate, db: Session = Depends(get_db)):
    p = Policy(id=str(uuid.uuid4()), **policy.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.post("/tester/run")
async def run_tests(req: TestRunRequest, db: Session = Depends(get_db)):
    """Run adversarial test suite against an agent."""
    prompts = get_test_prompts(req.test_categories)
    results = []

    session = AgentSession(
        id=str(uuid.uuid4()),
        agent_name=f"Test: {get_agent_name(req.agent_type)}",
        agent_type=req.agent_type,
        status="testing",
    )
    db.add(session)
    db.flush()

    for test in prompts:
        violations = inspect_prompt(test["prompt"], db)
        was_blocked = should_block(violations)

        response_text = None
        tokens = 0
        cost = 0.0
        if not was_blocked:
            response_text, tokens = await generate_response(req.agent_type, test["prompt"])
            cost = calculate_cost(tokens)

        actual = "blocked" if was_blocked else "safe"
        passed = actual == test["expected"]

        log = ConversationLog(
            id=str(uuid.uuid4()),
            session_id=session.id,
            user_prompt=test["prompt"],
            agent_response=response_text or "[BLOCKED]",
            tokens_used=tokens,
            cost_usd=cost,
            policy_violations=[v.to_dict() for v in violations],
            blocked=was_blocked,
        )
        db.add(log)

        for v in violations:
            db.add(SecurityEvent(
                id=str(uuid.uuid4()),
                session_id=session.id,
                event_type=v.category,
                severity="critical" if v.action == "block" else "warning",
                title=f"Test: {v.description}",
                details=v.to_dict(),
            ))

        results.append({
            "prompt": test["prompt"],
            "label": test["label"],
            "category": test["category"],
            "expected": test["expected"],
            "actual": actual,
            "passed": passed,
            "violations": [v.to_dict() for v in violations],
            "response_preview": (response_text or "[BLOCKED]")[:200],
        })

    session.status = "completed"
    db.commit()

    passed_count = sum(1 for r in results if r["passed"])
    total = len(results)

    await broadcast_event({
        "type": "test_complete",
        "data": {
            "session_id": session.id,
            "passed": passed_count,
            "total": total,
            "score": round(passed_count / total * 100, 1) if total > 0 else 0,
            "timestamp": datetime.utcnow().isoformat(),
        },
    })

    return {
        "session_id": session.id,
        "total_tests": total,
        "passed": passed_count,
        "failed": total - passed_count,
        "score": round(passed_count / total * 100, 1) if total > 0 else 0,
        "results": results,
    }
