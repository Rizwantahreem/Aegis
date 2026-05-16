"""Agent execution and session management endpoints."""

import uuid
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import AgentSession, ConversationLog, SecurityEvent
from ..schemas import AgentExecuteRequest, AgentExecuteResponse, SessionOut, ConversationLogOut
from ..services.lobster_trap import inspect_prompt, should_block
from ..services.gemini import generate_response, get_agent_name
from ..services.cost import calculate_cost
from .sse import broadcast_event

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.post("/execute", response_model=AgentExecuteResponse)
async def execute_agent(req: AgentExecuteRequest, db: Session = Depends(get_db)):
    """Execute an agent prompt with full Lobster Trap policy enforcement."""

    # Get or create session
    if req.session_id:
        session = db.query(AgentSession).filter(AgentSession.id == req.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = AgentSession(
            id=str(uuid.uuid4()),
            agent_name=get_agent_name(req.agent_type),
            agent_type=req.agent_type,
            status="active",
        )
        db.add(session)
        db.flush()

    # Step 1: Lobster Trap policy inspection
    violations = inspect_prompt(req.prompt, db)
    blocked = should_block(violations)
    violation_dicts = [v.to_dict() for v in violations]

    # Log security events for violations
    for v in violations:
        severity = "critical" if v.action == "block" else "warning"
        event = SecurityEvent(
            id=str(uuid.uuid4()),
            session_id=session.id,
            event_type=v.category,
            severity=severity,
            title=f"{'Blocked' if v.action == 'block' else 'Warning'}: {v.description}",
            details=v.to_dict(),
        )
        db.add(event)
        # Broadcast to SSE
        await broadcast_event({
            "type": "security_event",
            "data": {
                "id": event.id,
                "session_id": session.id,
                "event_type": v.category,
                "severity": severity,
                "title": event.title,
                "agent_name": session.agent_name,
                "detected_at": datetime.utcnow().isoformat(),
            },
        })

    response_text = None
    tokens_used = 0
    cost = 0.0

    if not blocked:
        # Step 2: Generate response via Gemini
        response_text, tokens_used = await generate_response(req.agent_type, req.prompt)
        cost = calculate_cost(tokens_used)

        # Check response for PII/violations too
        response_violations = inspect_prompt(response_text, db)
        if should_block(response_violations):
            blocked = True
            response_text = "[REDACTED] - Agent response contained policy violations and was blocked."
            violation_dicts.extend([v.to_dict() for v in response_violations])
            for v in response_violations:
                event = SecurityEvent(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    event_type=f"response_{v.category}",
                    severity="critical",
                    title=f"Response blocked: {v.description}",
                    details=v.to_dict(),
                )
                db.add(event)
    else:
        response_text = "[BLOCKED] - Your request was blocked by AgentGuard policy enforcement."

    # Step 3: Log the conversation
    log = ConversationLog(
        id=str(uuid.uuid4()),
        session_id=session.id,
        user_prompt=req.prompt,
        agent_response=response_text,
        tokens_used=tokens_used,
        cost_usd=cost,
        policy_violations=violation_dicts,
        blocked=blocked,
    )
    db.add(log)

    # Update session totals
    session.total_tokens += tokens_used
    session.total_cost += cost
    session.violations_count += len(violations)

    db.commit()

    # Broadcast activity
    await broadcast_event({
        "type": "agent_activity",
        "data": {
            "session_id": session.id,
            "agent_name": session.agent_name,
            "agent_type": req.agent_type,
            "prompt_preview": req.prompt[:80],
            "blocked": blocked,
            "violations": len(violations),
            "tokens": tokens_used,
            "cost": cost,
            "timestamp": datetime.utcnow().isoformat(),
        },
    })

    return AgentExecuteResponse(
        session_id=session.id,
        response=response_text,
        blocked=blocked,
        violations=violation_dicts,
        tokens_used=tokens_used,
        cost_usd=cost,
    )


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(AgentSession).order_by(desc(AgentSession.started_at)).limit(limit).all()


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(AgentSession).filter(AgentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions/{session_id}/logs", response_model=list[ConversationLogOut])
def get_session_logs(session_id: str, db: Session = Depends(get_db)):
    return db.query(ConversationLog).filter(
        ConversationLog.session_id == session_id
    ).order_by(ConversationLog.timestamp).all()
