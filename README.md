# Cognis

Adaptive learning platform based on cognitive science principles.

## Quick start

```bash
# Copy env
cp backend/.env.example backend/.env
# Add your AI API key to backend/.env

# Run
./run.sh
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000  
API docs: http://localhost:8000/docs

## Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **AI**: OpenAI-compatible API (configurable)

## Architecture

```
cognis/
├── backend/          # FastAPI API
│   ├── app/
│   │   ├── api/      # Routes + schemas
│   │   ├── core/     # Config, database
│   │   ├── models/   # SQLAlchemy models
│   │   └── services/ # AI, session engine
│   └── pyproject.toml
├── frontend/         # React SPA
│   ├── src/
│   │   ├── pages/    # Landing, Home, Session, Knowledge, History
│   │   ├── lib/      # API client
│   │   └── types/    # TypeScript types
│   └── package.json
└── run.sh            # Start both
```

## Learning loop

```
MAP → EXPOSE → RETRIEVE → APPLY → VARIATE → TRANSFER → COMPRESS → REVIEW
```

The system adapts based on: accuracy, response time, hints used, error type, and retention.
