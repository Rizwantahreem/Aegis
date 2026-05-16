"""Security events and audit log endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import SecurityEvent, ConversationLog
from ..schemas import SecurityEventOut, ConversationLogOut

router = APIRouter(prefix="/api", tags=["security"])


@router.get("/security/events", response_model=list[SecurityEventOut])
def list_security_events(
    severity: str = None,
    event_type: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(SecurityEvent)
    if severity:
        q = q.filter(SecurityEvent.severity == severity)
    if event_type:
        q = q.filter(SecurityEvent.event_type == event_type)
    return q.order_by(desc(SecurityEvent.detected_at)).limit(limit).all()


@router.get("/audit/logs", response_model=list[ConversationLogOut])
def list_audit_logs(
    search: str = None,
    blocked_only: bool = False,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(ConversationLog)
    if search:
        q = q.filter(
            ConversationLog.user_prompt.contains(search)
            | ConversationLog.agent_response.contains(search)
        )
    if blocked_only:
        q = q.filter(ConversationLog.blocked == True)
    return q.order_by(desc(ConversationLog.timestamp)).limit(limit).all()
