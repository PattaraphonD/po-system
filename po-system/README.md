# 🛒 PO System — Purchase Order Management

A full-stack Purchase Order management system for **Microchip Technology Thailand**, built entirely on **free-tier** cloud infrastructure.

---

## ✨ Features

| Module | Description |
|---|---|
| **Dashboard** | KPI cards, monthly spend charts, status breakdown |
| **Quotations** | Create, track, and convert quotations to POs |
| **Purchase Orders** | Full CRUD with approval workflow (Draft → Submitted → Approved) |
| **Suppliers** | Vendor master management |
| **Reports** | Analytics charts + CSV export |
| **PDF Export** | Auto-generate formatted PO documents |
| **Email Notifications** | Automated emails on submit / approve / reject |

---

## 🏗 Architecture (100% Free)

```
Frontend (React + Vite)          Backend (Cloudflare Workers)
GitHub Pages ──────────────────► Hono API (edge, 100k req/day free)
                                         │
                              ┌──────────┴──────────┐
                         D1 Database            R2 Storage
                      (SQLite, 5GB free)    (Files, 10GB free)
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- npm 9+
- Cloudflare account (free) — [cloudflare.com](https://cloudflare.com)
- GitHub account — [github.com](https://github.com)

---

### Step 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/po-system.git
cd po-system

# Install frontend deps
cd frontend && npm install && cd ..

# Install API deps
cd api && npm install && cd ..
```

---

### Step 2 — Setup Cloudflare Resources

Install Wrangler CLI and login:
```bash
npm install -g wrangler
wrangler login
```

Create D1 database:
```bash
cd api
wrangler d1 create po-system-db
# Copy the database_id shown and paste into wrangler.toml → database_id
```

Create R2 bucket:
```bash
wrangler r2 bucket create po-documents
```

Create KV namespace:
```bash
wrangler kv:namespace create po-kv
# Copy the id shown and paste into wrangler.toml → kv_namespaces id
```

Run database migrations:
```bash
wrangler d1 execute po-system-db --local --file=src/db/schema.sql
wrangler d1 execute po-system-db --local --file=src/db/seed.sql
```

---

### Step 3 — Set API Secrets

```bash
cd api
wrangler secret put JWT_SECRET
# Enter: any-long-random-string (e.g. openssl rand -base64 32)

wrangler secret put RESEND_API_KEY
# Enter: your Resend API key (or type "placeholder" to skip emails)
```

---

### Step 4 — Run Locally

Terminal 1 — Start API:
```bash
cd api
npm run dev
# API running at http://localhost:8787
```

Terminal 2 — Start Frontend:
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local: VITE_API_URL=http://localhost:8787
npm run dev
# App running at http://localhost:5173
```

---

### Step 5 — Login

Open http://localhost:5173 and use one of the demo accounts:

| Role | Email | Password |
|---|---|---|
| Buyer | waraporn@microchip.co.th | (any) |
| Approver | manager@microchip.co.th | (any) |
| Admin | admin@microchip.co.th | (any) |

---

## ☁️ Deploy to GitHub Pages + Cloudflare

### Deploy the API

```bash
cd api
# Make sure wrangler.toml has correct database_id and kv namespace id
npm run deploy
# Note the Workers URL: https://po-system-api.YOUR_SUBDOMAIN.workers.dev
```

### Deploy the Frontend

1. Push your code to GitHub
2. Enable GitHub Pages: **Settings → Pages → Source: GitHub Actions**
3. Add these repository secrets: **Settings → Secrets → Actions**:

```
CLOUDFLARE_API_TOKEN   = (from cloudflare.com/profile/api-tokens → Edit Workers)
CLOUDFLARE_ACCOUNT_ID  = (from cloudflare.com → right sidebar)
VITE_API_URL           = https://po-system-api.YOUR_SUBDOMAIN.workers.dev
```

4. Push to `main` branch — GitHub Actions will auto-deploy.

Your app will be live at:
```
https://YOUR_USERNAME.github.io/po-system/
```

---

## 📁 Project Structure

```
po-system/
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml   # GitHub Pages CI/CD
│       └── deploy-api.yml        # Cloudflare Workers CI/CD
│
├── frontend/                     # React + Vite SPA
│   ├── src/
│   │   ├── pages/                # Route pages
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Quotations.tsx
│   │   │   ├── QuotationDetail.tsx
│   │   │   ├── PurchaseOrders.tsx
│   │   │   ├── PODetail.tsx
│   │   │   ├── NewPO.tsx
│   │   │   ├── Suppliers.tsx
│   │   │   └── Reports.tsx
│   │   ├── components/
│   │   │   ├── UI.tsx            # Shared components
│   │   │   └── Sidebar.tsx       # Navigation
│   │   └── lib/
│   │       ├── api.ts            # API client + Auth context
│   │       ├── utils.ts          # Formatters
│   │       └── pdfGenerator.ts   # jsPDF PO export
│   └── package.json
│
└── api/                          # Cloudflare Workers (Hono)
    ├── src/
    │   ├── index.ts              # App entry + router
    │   ├── types.ts              # TypeScript types
    │   ├── routes/
    │   │   ├── auth.ts           # Login, register, me
    │   │   ├── suppliers.ts      # Supplier CRUD
    │   │   ├── quotations.ts     # Quotation CRUD
    │   │   ├── purchaseOrders.ts # PO CRUD + workflow
    │   │   └── reports.ts        # Analytics + CSV export
    │   ├── db/
    │   │   ├── schema.sql        # D1 table definitions
    │   │   └── seed.sql          # Sample data
    │   └── lib/
    │       ├── auth.ts           # JWT helpers
    │       ├── helpers.ts        # ID gen, VAT calc
    │       └── email.ts          # Resend email
    └── wrangler.toml             # Cloudflare config
```

---

## 🔄 PO Workflow

```
Draft ──► Submitted ──► In Review ──► Approved ──► Ordered ──► Closed
                                           │
                                           └──► Rejected ──► Draft (revised)
```

- **Buyer** creates a PO (Draft) and submits it
- **Approver/Admin** reviews and approves or rejects
- Email notifications sent at each transition
- Full audit trail stored in `approvals` table

---

## 🗃 Database Tables

| Table | Description |
|---|---|
| `users` | System users with roles (buyer, approver, admin) |
| `suppliers` | Vendor master |
| `quotations` | Received quotations with line items |
| `quotation_items` | Line items for each quotation |
| `purchase_orders` | POs with status tracking |
| `po_items` | Line items for each PO |
| `approvals` | Full audit trail of all actions |

---

## 💰 Monthly Cost

| Service | Free Tier | Usage |
|---|---|---|
| GitHub Pages | Unlimited | Frontend hosting |
| GitHub Actions | 2,000 min/month | CI/CD |
| Cloudflare Workers | 100,000 req/day | API |
| Cloudflare D1 | 5GB + 25M reads/day | Database |
| Cloudflare R2 | 10GB + 1M ops/month | File storage |
| Resend | 3,000 emails/month | Notifications |
| **Total** | **฿0** | |

---

## 🔧 Configuration

### Add Email Notifications (Resend)
1. Sign up at [resend.com](https://resend.com) (free: 3k emails/month)
2. Get API key
3. `wrangler secret put RESEND_API_KEY`
4. Update `from` address in `api/src/lib/email.ts`

### Custom Domain
- **Frontend**: Settings → Pages → Custom domain
- **API**: Cloudflare dashboard → Workers → Custom domain

---

## 📝 License

MIT — free to use and modify.

---

*Built for Microchip Technology (Thailand) Co., Ltd. — Chachemgsao, Thailand*
