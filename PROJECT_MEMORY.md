# AGENTGUARD - Project Memory & Context

## Quick Context for AI Assistants
**Read this file first when resuming work on this project.**

AgentGuard is an Enterprise Agent Control Center built for the TechEx Intelligent Enterprise Solutions Hackathon (lablab.ai). Submission deadline: **May 18, 2026**.

### What is AgentGuard?
A real-time observability and security platform for AI agents. It sits between enterprise agents and LLMs, enforcing policies (via Lobster Trap concepts), catching prompt injections, PII leaks, and tracking costs.

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Recharts
- **Backend**: Python FastAPI + SQLite (via SQLAlchemy) + SSE for real-time
- **AI**: Google Gemini (gemini-2.0-flash) for demo agents
- **Deployment**: Vercel (frontend) + Render (backend)

### Project Structure
```
observibility/
├── PROJECT_MEMORY.md          # THIS FILE - read first
├── PROGRESS.md                # Current progress tracker
├── frontend/                  # Next.js 14 app
│   ├── src/
│   │   ├── app/               # App router pages
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── agents/        # Agent monitor
│   │   │   ├── security/      # Security events
│   │   │   ├── audit/         # Audit logs
│   │   │   ├── tester/        # Agent tester (red team)
│   │   │   └── settings/      # Settings page
│   │   ├── components/        # Reusable UI components
│   │   │   ├── layout/        # Header, Sidebar, Layout
│   │   │   ├── dashboard/     # Dashboard-specific components
│   │   │   ├── charts/        # Chart components
│   │   │   └── common/        # Buttons, Cards, Badges, etc.
│   │   ├── lib/               # Utilities
│   │   │   ├── api.ts         # API client
│   │   │   └── sse.ts         # SSE real-time client
│   │   └── types/             # TypeScript types
│   └── ...config files
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry
│   │   ├── config.py          # Settings & env vars
│   │   ├── database.py        # SQLAlchemy setup
│   │   ├── models.py          # DB models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── agents.py      # Agent execution endpoints
│   │   │   ├── sessions.py    # Session management
│   │   │   ├── security.py    # Security events
│   │   │   └── audit.py       # Audit log endpoints
│   │   ├── services/
│   │   │   ├── gemini.py      # Gemini API integration
│   │   │   ├── lobster_trap.py # Policy enforcement engine
│   │   │   ├── security.py    # Security detection (PII, injections)
│   │   │   └── cost.py        # Cost tracking
│   │   └── data/
│   │       └── test_prompts.py # Adversarial test data
│   ├── requirements.txt
│   └── Dockerfile
└── README.md
```

### Key Architecture Decisions
1. **SQLite over PostgreSQL** - Faster to ship, no external DB dependency for MVP
2. **SSE over WebSocket** - Simpler, one-directional real-time (server→client) is all we need
3. **Lobster Trap simulation** - We simulate the policy engine in Python rather than integrating the Go binary. The concepts are the same (pattern matching, policy rules), and judges evaluate the product not the binary.
4. **In-memory metrics** - No Redis. We keep recent metrics in Python dicts for real-time dashboard.
5. **Next.js App Router** - Modern React with server components where useful, but mostly client components for the interactive dashboard.

### Environment Variables Required
```
# Backend (.env)
GEMINI_API_KEY=<from Google AI Studio>
DATABASE_URL=sqlite:///./agentguard.db
FRONTEND_URL=http://localhost:3000

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### API Endpoints
```
POST /api/agents/execute          - Execute agent with monitoring
GET  /api/agents/sessions         - List all sessions
GET  /api/agents/sessions/{id}    - Get session details
GET  /api/security/events         - Get security events (filterable)
GET  /api/audit/logs              - Get audit logs (searchable)
GET  /api/metrics/dashboard       - Dashboard summary metrics
GET  /api/metrics/stream          - SSE real-time event stream
POST /api/tester/run              - Run adversarial test suite
GET  /api/tester/results/{id}     - Get test results
POST /api/policies                - Add/update policies
GET  /api/policies                - List policies
```

### Demo Agents
1. **Customer Service Agent** - Handles support queries. Risk: PII exposure.
2. **Data Analyst Agent** - Answers data questions. Risk: SQL injection.
3. **Email Assistant Agent** - Drafts emails. Risk: Prompt injection.

### Lobster Trap Policy Rules (Simulated)
- `block_prompt_injection` - Detects "ignore previous", "bypass", "developer mode", etc.
- `block_pii_leakage` - Regex for emails, SSNs, credit cards, phone numbers
- `block_dangerous_commands` - SQL injection, shell commands (rm, DROP, DELETE)
- `rate_limit_tokens` - Alert when single request > 2000 tokens
- `cost_threshold` - Alert when session cost > $1.00

### Git Configuration
- **Email**: tahreem.1701203@gmail.com
- **Username**: Rizwantahreem
- **License**: MIT
- **Repo**: Only for this directory (observibility/)

### Hackathon Judging Criteria
- Model Integration (30%) - Gemini + Lobster Trap
- Presentation (25%) - Video + pitch deck
- Business Impact (25%) - Enterprise security problem
- Creativity (20%) - Red team testing, security theater concept
