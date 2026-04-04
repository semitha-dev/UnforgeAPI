# UnforgeAPI

**An intelligent AI API router** that automatically classifies incoming queries and routes them to the optimal processing path  simple chat, context-based answers, live web search, or full deep research  so your app gets the right answer without you wiring up the logic yourself.

---

## What It Does

```
User Question → [Intelligent Router] → Best Path → Answer
                       ↓
             "What does this need?"
                       ↓
        ┌──────────────┼──────────────┐
      CHAT          CONTEXT       RESEARCH
   (General)    (User data)    (Web search)
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/chat` | Routes query to chat, context, or web search automatically |
| `POST /api/v1/chat/stream` | Streaming variant of the chat router |
| `POST /api/v1/deep-research` | Full deep research pipeline with sourced report |
| `GET  /api/v1/usage` | Query token and request usage for the authenticated key |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend + API** | Next.js 16 (App Router), TypeScript |
| **Auth** | Supabase (Postgres + Auth) |
| **AI Inference** | Groq (LLaMA), Google Gemini, AI SDK |
| **Web Search** | Tavily |
| **API Key Management** | Unkey |
| **Payments** | Polar.sh |
| **Deployment** | Vercel (web) |

---

## Project Structure

```
UnforgeAPI/
├── web/                        # Next.js application
│   ├── app/
│   │   ├── api/                # All API route handlers
│   │   │   ├── v1/             # Public API (chat, deep-research, usage)
│   │   │   ├── admin/          # Admin endpoints (stats, users, logs, feedback)
│   │   │   ├── keys/           # API key management
│   │   │   ├── profile/        # User profile CRUD
│   │   │   ├── subscription/   # Billing & subscription management
│   │   │   ├── analytics/      # Usage analytics
│   │   │   ├── workspaces/     # Workspace management
│   │   │   └── webhooks/       # Polar.sh webhook handler
│   │   ├── (pages)/            # UI pages (dashboard, docs, blog, etc.)
│   │   └── (landing)/          # Marketing landing page
│   ├── lib/
│   │   ├── router.ts           # Core query classification & routing logic
│   │   ├── subscription.ts     # Subscription tier utilities
│   │   └── logger.ts           # Structured logging
│   └── components/             # Shared UI components
└── README.md
```

---

## Pricing Tiers

| Plan | Price | AI Keys | Limits |
|------|-------|---------|--------|
| **Sandbox** | Free | Provided | 50 req/day, no search |
| **Managed Pro** | $19.99/mo | Provided | 50k req/mo, 1k search |
| **BYOK Starter** | Free | Your own | 100 req/day |
| **BYOK Pro** | $4.99/mo | Your own | Unlimited (10 req/sec) |

BYOK (Bring Your Own Keys) tiers let users supply their own Groq, Tavily, and Google API keys  paying those providers directly at a lower platform cost.

---

## Local Development

### Prerequisites

- Node.js ≥ 20.9.0
- A [Supabase](https://supabase.com) project
- API keys: Groq, Tavily, Unkey, Polar.sh (optional for local)

### Setup

```bash
# 1. Install dependencies
cd web
npm install

# 2. Configure environment
cp env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
cd web
npm run build
npm run start
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-only) |
| `GROQ_API_KEY` | ✅ | Groq inference key |
| `TAVILY_API_KEY` | ✅ | Tavily web search key |
| `UNKEY_ROOT_KEY` | ✅ | Unkey root key for API key management |
| `POLAR_WEBHOOK_SECRET` | ✅ | Polar.sh webhook signing secret |
| `NEXT_PUBLIC_API_URL` | ✅ | Base URL of this deployment |
| `NEXT_PUBLIC_POSTHOG_KEY` | ☑️ | PostHog analytics key (optional) |

See `web/env.example` for the full list.

---

## Deployment

### Vercel (Web)

1. Import the repository into Vercel
2. Set **Root Directory** to `web`
3. Add all environment variables in the Vercel project settings
4. Deploy — Vercel handles the rest

---

## License

Private — all rights reserved.
