# UnforgeAPI Go Server

Go backend for UnforgeAPI — an intelligent API router with deep research capabilities.

## Quick Start

```bash
# Copy env and fill in values
cp .env.example .env

# Download dependencies
go mod tidy

# Run server
go run ./cmd/server
```

## Project Structure

```
server/
├── cmd/server/main.go          # Entry point, route wiring
├── internal/
│   ├── config/                  # Environment config loader
│   ├── middleware/              # Auth (JWT), CORS, logging
│   ├── handler/                 # HTTP handlers (one per route group)
│   ├── service/                 # Business logic (router brain, activity logger)
│   ├── model/                   # Shared types, subscription constants
│   └── client/                  # External API clients (Supabase, Unkey, Redis, Groq, Tavily, Polar)
├── pkg/security/                # Security utilities
├── Dockerfile                   # Multi-stage Docker build
├── go.mod / go.sum
└── .env.example
```

## API Routes

### Public (API Key auth via Unkey)
- `POST /api/v1/chat` — Intelligent chat router
- `POST /api/v1/deep-research` — 3-iteration agentic deep research
- `GET  /api/v1/usage` — API-key-based usage stats

### Authenticated (Supabase JWT)
- `GET  /api/subscription` — Current subscription info
- `POST /api/subscription/checkout` — Polar checkout
- `POST /api/subscription/manage` — Manage subscription
- `POST /api/subscription/sync` — Sync with Polar
- `GET/POST/DELETE /api/keys` — API key CRUD
- `GET/POST /api/workspaces` — Workspace management
- `GET  /api/profile` — Get profile
- `PUT  /api/profile` — Update profile
- `POST /api/profile/setup` — Onboarding setup
- `GET  /api/usage` — Dashboard usage
- `GET  /api/analytics` — Analytics dashboard
- `GET  /api/admin/stats|users|logs|feedback` — Admin endpoints

### Webhooks
- `POST /api/webhooks/polar` — Polar payment webhooks

### Other
- `GET  /api/debug` — Server debug info
- `GET  /health` — Health check
- `POST /api/subscription/reconcile` — Cron: reconcile subscriptions

## Docker

```bash
docker build -t unforgeapi-server .
docker run -p 8080:8080 --env-file .env unforgeapi-server
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | chi (lightweight Go HTTP router) |
| Database  | Supabase PostgREST API |
| Auth      | Supabase JWT validation |
| Cache     | Upstash Redis (go-redis) |
| API Keys  | Unkey HTTP API |
| Payments  | Polar HTTP API |
| LLM       | Groq API (llama-3.1-8b, llama-3.3-70b) |
| Search    | Tavily API |
