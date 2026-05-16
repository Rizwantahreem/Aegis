import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from .database import Base


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_name = Column(String(255), nullable=False)
    agent_type = Column(String(100), nullable=False)  # customer_service, data_analyst, email_assistant
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="active")  # active, completed, blocked, error
    total_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    violations_count = Column(Integer, default=0)

    logs = relationship("ConversationLog", back_populates="session", cascade="all, delete-orphan")
    events = relationship("SecurityEvent", back_populates="session", cascade="all, delete-orphan")


class ConversationLog(Base):
    __tablename__ = "conversation_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("agent_sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_prompt = Column(Text, nullable=False)
    agent_response = Column(Text, nullable=True)
    tokens_used = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    policy_violations = Column(JSON, default=list)
    blocked = Column(Boolean, default=False)

    session = relationship("AgentSession", back_populates="logs")


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("agent_sessions.id"), nullable=True)
    event_type = Column(String(100), nullable=False)  # prompt_injection, pii_leak, dangerous_command, cost_alert, rate_limit
    severity = Column(String(20), nullable=False)  # critical, warning, info
    title = Column(String(255), nullable=False)
    details = Column(JSON, default=dict)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)

    session = relationship("AgentSession", back_populates="events")


class Policy(Base):
    __tablename__ = "policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    pattern = Column(Text, nullable=False)  # regex pattern
    action = Column(String(50), default="block")  # block, warn, log
    category = Column(String(100), nullable=False)  # injection, pii, command, cost
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
