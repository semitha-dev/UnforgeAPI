# Deployment Guide

This project uses a split architecture:
- **Frontend (Next.js)**: Deployed on Vercel
- **Backend (Go)**: Deployed on Railway

## 🚀 Quick Deploy

### Frontend - Vercel

1. **Connect Repository**
   ```bash
   # Push to GitHub (already done)
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your `semitha-dev/UnforgeAPI` repository
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

3. **Environment Variables** (Add in Vercel Dashboard)
   ```env
   # Backend API
   NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   
   # Analytics (optional)
   NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically deploy on every push to `main`

---

### Backend - Railway

1. **Create New Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `semitha-dev/UnforgeAPI`
   - **Root Directory**: `server`

2. **Configure Service**
   - Railway will auto-detect the Dockerfile
   - Set **Start Command**: `/app/server`
   - Set **Port**: `8080`

3. **Environment Variables** (Add in Railway Dashboard)
   ```env
   # Server
   PORT=8080
   APP_ENV=production
   
   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   
   # Unkey (API key management)
   UNKEY_ROOT_KEY=your-unkey-root-key
   
   # Upstash Redis
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   
   # Polar (payments)
   POLAR_WEBHOOK_SECRET=your-polar-webhook-secret
   POLAR_MANAGED_INDIE_PRODUCT_ID=prod_xxx
   POLAR_MANAGED_PRO_PRODUCT_ID=prod_xxx
   POLAR_MANAGED_EXPERT_PRODUCT_ID=prod_xxx
   POLAR_MANAGED_PRODUCTION_PRODUCT_ID=prod_xxx
   
   # LLM Providers
   GROQ_API_KEY=your-groq-api-key
   GOOGLE_API_KEY=your-google-api-key
   OPENAI_API_KEY=your-openai-api-key
   
   # Tavily (web search)
   TAVILY_API_KEY=your-tavily-api-key
   
   # CORS (your Vercel frontend URL)
   CORS_ORIGIN=https://your-app.vercel.app
   
   # Debug
   DEBUG=false
   DEBUG_VERBOSE=false
   ```

4. **Generate Domain**
   - Railway will provide a domain like `your-app.railway.app`
   - Copy this URL

5. **Update Vercel Environment Variable**
   - Go back to Vercel Dashboard
   - Update `NEXT_PUBLIC_API_URL` to your Railway URL
   - Redeploy the frontend

---

## 🔄 Deployment Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   GitHub    │────────▶│   Vercel     │────────▶│   Users     │
│   (main)    │         │  (Frontend)  │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      │                        │ API Requests            │
      │                        ▼                         │
      │                 ┌──────────────┐                 │
      └────────────────▶│   Railway    │◀────────────────┘
                        │  (Backend)   │
                        └──────────────┘
```

---

## 📝 Post-Deployment Checklist

- [ ] Backend deployed on Railway with public URL
- [ ] Frontend deployed on Vercel
- [ ] `NEXT_PUBLIC_API_URL` set in Vercel to Railway URL
- [ ] `CORS_ORIGIN` set in Railway to Vercel URL
- [ ] All environment variables configured
- [ ] Test API endpoints: `https://your-railway-app.railway.app/health`
- [ ] Test frontend: `https://your-app.vercel.app`
- [ ] Webhook endpoints configured (Polar, etc.)

---

## 🔧 Local Development

### Backend
```bash
cd server
cp .env.example .env
# Edit .env with your values
go run cmd/server/main.go
```

### Frontend
```bash
cd web
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8080
npm run dev
```

---

## 🐛 Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` in Railway matches your Vercel URL exactly
- Check Railway logs for CORS-related errors

### API Not Responding
- Check Railway deployment logs
- Verify health endpoint: `https://your-railway-app.railway.app/health`
- Ensure PORT=8080 is set in Railway

### Environment Variables Not Working
- Redeploy after adding new env vars
- Check for typos in variable names
- Verify secrets are not exposed in logs

---

## 📊 Monitoring

- **Railway**: Built-in metrics and logs
- **Vercel**: Analytics dashboard
- **Supabase**: Database metrics
- **Upstash**: Redis metrics
