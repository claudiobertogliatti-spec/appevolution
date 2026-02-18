# Evolution PRO OS - Server Architecture

## Current State
- `server.py`: 10,770 lines, 295 endpoints (MONOLITH)
- Last updated: 2026-02-18

## Endpoint Distribution by Module

| Module | Endpoints | Lines (est.) | Priority |
|--------|-----------|--------------|----------|
| systeme | 45 | ~1,500 | P1 |
| stefania | 33 | ~1,200 | P2 |
| partners | 18 | ~800 | P1 |
| atlas | 13 | ~500 | P3 |
| editor | 11 | ~600 | P3 |
| youtube | 10 | ~500 | P2 |
| orion | 9 | ~400 | P2 |
| heygen | 9 | ~400 | P3 |
| email-automation | 9 | ~400 | P3 |
| andrea | 7 | ~300 | P3 |
| gaia | 7 | ~300 | P2 |
| legal | 7 | ~300 | P3 |
| masterclass | 7 | ~300 | P3 |
| valentina | 6 | ~300 | P1 |
| auth | 5 | ~200 | P1 |
| chat | 5 | ~200 | P1 |
| agent-tasks | 5 | ~200 | P1 |
| agent-hub | 5 | ~200 | P2 |
| Other | 94 | ~3,000 | P3 |

## Target Architecture

```
/app/backend/
├── server.py              # Main app, CORS, startup, core models
├── routers/
│   ├── __init__.py
│   ├── dependencies.py    # Shared DB, auth, utils
│   ├── auth.py           # Authentication (5 endpoints)
│   ├── partners.py       # Partner management (18 endpoints)
│   ├── agents.py         # VALENTINA, chat, agent-tasks (16 endpoints)
│   ├── stefania.py       # Copy Factory, War Mode (33 endpoints)
│   ├── systeme.py        # Systeme.io integration (45 endpoints)
│   ├── orion.py          # Lead Intelligence (9 endpoints)
│   ├── andrea.py         # Video Production (7 endpoints)
│   ├── gaia.py           # Funnel Deployer (7 endpoints)
│   ├── atlas.py          # Post-sale/LTV (13 endpoints)
│   └── media.py          # YouTube, Cloudinary, Files (20 endpoints)
├── services/
│   ├── valentina_ai.py   # ✅ Already separated
│   ├── valentina_actions.py # ✅ Already separated
│   ├── valentina_memory.py  # ✅ Already separated
│   ├── integrated_services.py # ✅ Already separated
│   ├── orion_service.py     # ✅ Already separated
│   └── agent_hub_service.py # ✅ Already separated
└── models/
    ├── __init__.py
    ├── partner.py
    ├── agent.py
    └── stefania.py
```

## Migration Strategy

### Phase 1 (Current) - ✅ Done
- Separate AI logic into dedicated files
- valentina_ai.py, valentina_actions.py, integrated_services.py

### Phase 2 (Next)
- Create router files with endpoint stubs
- Gradually move endpoints maintaining backwards compatibility
- Test each migration thoroughly

### Phase 3 (Future)
- Extract models to dedicated files
- Create shared utilities
- Add comprehensive tests

## Key Dependencies in server.py

```python
# Database
db = client[db_name]  # MongoDB Motor client

# Services
orion_scoring = init_orion(db)
agent_hub = init_agent_hub(db)
auth_service = AuthService(db)

# External
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
SYSTEME_API_KEY = os.environ.get('SYSTEME_API_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
```

## Notes
- All routes are prefixed with `/api` via `api_router`
- CORS configured for production + preview domains
- Hot reload enabled via uvicorn watchfiles
- Background worker started on startup for agent tasks
