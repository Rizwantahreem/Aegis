"""AgentGuard Backend - FastAPI Application"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .config import get_settings
from .database import init_db, SessionLocal
from .routers import agents, security, metrics, auth, agent_mgmt
from .routers.sse import event_generator
from .services.lobster_trap import seed_policies
from .routers.auth import seed_demo_user

settings = get_settings()

app = FastAPI(
    title="AgentGuard API",
    description="Enterprise Agent Control Center - Real-time observability & security for AI agents",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(security.router)
app.include_router(metrics.router)
app.include_router(auth.router)
app.include_router(agent_mgmt.router)


def run_migrations():
    """Apply any missing schema changes to existing SQLite DB."""
    from .database import engine
    with engine.connect() as conn:
        # Add system_prompt column to registered_agents if missing
        try:
            conn.execute(__import__("sqlalchemy").text(
                "ALTER TABLE registered_agents ADD COLUMN system_prompt TEXT"
            ))
            conn.commit()
        except Exception:
            pass  # Column already exists


@app.on_event("startup")
def on_startup():
    init_db()
    run_migrations()
    db = SessionLocal()
    try:
        seed_policies(db)
        seed_demo_user(db)
    finally:
        db.close()


@app.get("/api/metrics/stream")
async def sse_stream():
    """SSE endpoint for real-time dashboard updates."""
    return EventSourceResponse(event_generator())


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "agentguard-api"}
