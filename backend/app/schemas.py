from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AgentExecuteRequest(BaseModel):
    agent_type: str  # customer_service, data_analyst, email_assistant
    prompt: str
    session_id: Optional[str] = None


class AgentExecuteResponse(BaseModel):
    session_id: str
    response: Optional[str] = None
    blocked: bool = False
    violations: list = []
    tokens_used: int = 0
    cost_usd: float = 0.0


class SessionOut(BaseModel):
    id: str
    agent_name: str
    agent_type: str
    started_at: datetime
    status: str
    total_tokens: int
    total_cost: float
    violations_count: int

    class Config:
        from_attributes = True


class ConversationLogOut(BaseModel):
    id: str
    session_id: str
    timestamp: datetime
    user_prompt: str
    agent_response: Optional[str]
    tokens_used: int
    cost_usd: float
    policy_violations: list
    blocked: bool

    class Config:
        from_attributes = True


class SecurityEventOut(BaseModel):
    id: str
    session_id: Optional[str]
    event_type: str
    severity: str
    title: str
    details: dict
    detected_at: datetime
    resolved: bool

    class Config:
        from_attributes = True


class PolicyOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    pattern: str
    action: str
    category: str
    enabled: bool

    class Config:
        from_attributes = True


class PolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    pattern: str
    action: str = "block"
    category: str
    enabled: bool = True


class TestRunRequest(BaseModel):
    agent_type: str = "customer_service"
    test_categories: list[str] = ["all"]  # injection, pii, command, safe


class DashboardMetrics(BaseModel):
    total_sessions: int = 0
    active_sessions: int = 0
    total_interactions: int = 0
    total_violations: int = 0
    total_cost: float = 0.0
    blocked_attacks: int = 0
    avg_response_time_ms: float = 0.0
    violation_rate: float = 0.0
    recent_events: list[SecurityEventOut] = []
    recent_logs: list[ConversationLogOut] = []
