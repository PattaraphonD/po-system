# PO System — Railway Edition

Full-stack Purchase Order management system running on **Railway + GitHub Pages**.
No credit card required. No Cloudflare account needed.

---

## Stack (100% Free, No Card)

| Layer | Service | Free Tier |
|---|---|---|
| Frontend | GitHub Pages | Unlimited |
| API | Railway (Node.js + Hono) | $5/month free credit |
| Database | Railway PostgreSQL | Included |
| CI/CD | GitHub Actions | 2,000 min/month |
| Email | Resend | 3,000/month (optional) |

---

## Local Development — Step by Step

### 1. Install dependencies
```bash
cd api && npm install
cd ../frontend && npm install
```

### 2. Set up Railway PostgreSQL locally

**Option A — Use Railway's DB remotely (easiest):**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login — opens browser, works in Codespace!
railway login

# Create a new project
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Get the connection string
railway variables
# Copy the DATABASE_URL value
```

**Option B — Local PostgreSQL (if you have it installed):**
```bash
createdb po_system
# DATABASE_URL=postgresql://localhost/po_system
```

### 3. Configure environment
```bash
cd api
cp .env.example .env
# Edit .env and paste your DATABASE_URL
```

### 4. Run migrations and seed data
```bash
cd api
npm run db:init    # creates all tables
npm run db:seed    # loads sample quotations from Pattarapol
```

### 5. Start the API
```bash
cd api
npm run dev
# API running at http://localhost:3000
# Test: http://localhost:3000/api/health
```

### 6. Start the frontend (new terminal)
```bash
cd frontend
cp .env.example .env.local
# .env.local already has VITE_API_URL=http://localhost:3000
npm run dev
# Open http://localhost:5173
```

### 7. Login
Open http://localhost:5173 — use the demo buttons on the login page:
- **Buyer** — waraporn@microchip.co.th (any password)
- **Approver** — manager@microchip.co.th (any password)
- **Admin** — admin@microchip.co.th (any password)

---

## Deploy to Internet

### Deploy API to Railway

```bash
cd api

# Login to Railway
railway login

# Link to your project (created above) or create new
railway init

# Set environment variables on Railway
railway variables set JWT_SECRET="your-long-random-secret"
railway variables set RESEND_API_KEY="placeholder"
railway variables set FRONTEND_URL="https://YOUR_USERNAME.github.io/po-system-railway"
railway variables set NODE_ENV="production"

# Deploy
railway up

# Run migrations on production DB
railway run npm run db:init
railway run npm run db:seed

# Get your live API URL
railway open
# Looks like: https://po-system-api-production.up.railway.app
```

### Deploy Frontend to GitHub Pages

1. Push repo to GitHub
2. **Settings → Pages → Source: GitHub Actions**
3. **Settings → Secrets → Actions** — add these secrets:

| Secret | Value |
|---|---|
| `RAILWAY_TOKEN` | From railway.com → Account → Tokens → Create |
| `VITE_API_URL` | Your Railway API URL (from `railway open`) |

4. Push to `main` — auto-deploys both API and frontend

**Live at:** `https://YOUR_USERNAME.github.io/po-system-railway/`

---

## Project Structure

```
po-system-railway/
├── .github/workflows/
│   ├── deploy-api.yml          # Railway deploy on push
│   └── deploy-frontend.yml     # GitHub Pages deploy on push
│
├── api/                        # Node.js + Hono API
│   ├── src/
│   │   ├── index.js            # Server entry point (port 3000)
│   │   ├── db/
│   │   │   ├── client.js       # PostgreSQL pool + query helpers
│   │   │   ├── migrate.js      # Run: npm run db:init
│   │   │   └── seed.js         # Run: npm run db:seed
│   │   ├── lib/
│   │   │   ├── auth.js         # JWT (pure Node crypto, no bcrypt)
│   │   │   ├── helpers.js      # ID gen, PO number, VAT calc
│   │   │   └── email.js        # Resend integration
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── suppliers.js
│   │       ├── quotations.js
│   │       ├── purchaseOrders.js
│   │       └── reports.js
│   ├── .env.example
│   ├── package.json
│   └── railway.toml
│
└── frontend/                   # React + Vite (unchanged from original)
    └── src/
        ├── pages/              # Dashboard, POs, Quotations, etc.
        ├── components/         # Sidebar, UI components
        └── lib/
            ├── api.ts          # API client (reads VITE_API_URL)
            ├── utils.ts
            └── pdfGenerator.ts # jsPDF — works unchanged
```

---

## Key Differences from Cloudflare Version

| Feature | Cloudflare | Railway |
|---|---|---|
| Runtime | Edge Workers | Node.js 20 |
| Database | D1 (SQLite) | PostgreSQL |
| SQL params | `?` placeholders | `$1,$2` placeholders |
| Auth | Wrangler login | `railway login` (works in Codespace) |
| File storage | R2 (needs card) | Local volume or skip |
| Cold start | ~0ms (edge) | ~1s first request |
| Free tier | 100k req/day | $5 credit/month |

---

## API Endpoints

```
GET  /api/health

POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me

GET  /api/suppliers
POST /api/suppliers
GET  /api/suppliers/:id
PATCH /api/suppliers/:id

GET  /api/quotations
POST /api/quotations
GET  /api/quotations/:id
PATCH /api/quotations/:id

GET  /api/pos
POST /api/pos
GET  /api/pos/:id
PATCH /api/pos/:id
POST /api/pos/:id/submit
POST /api/pos/:id/approve
POST /api/pos/:id/reject
POST /api/pos/:id/close
DELETE /api/pos/:id

GET  /api/reports/summary
GET  /api/reports/export
```
