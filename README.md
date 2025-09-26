# Fix My Barangay – Civic Issue Reporting PWA

Community-powered reporting for local infrastructure, sanitation, safety, water, and electrical issues. Anonymous residents submit issues with photo + location; authenticated admins triage, update status, and track progress. Offline-first, installable, mobile-centric.

MVP Scope Complete (T001–T053) – Ready for deployment.

## ✨ Core Capabilities

- Anonymous issue reporting (no sign-up friction)
- Photo upload with Cloudinary compression (≤10MB → ~2MB)
- Auto + manual Mapbox geolocation (with fallback selector)
- Dual list & map views with advanced filters
- Offline queue + background sync (reports submit when online)
- Installable PWA (Android home screen)
- Admin dashboard (Clerk-protected) with status workflow
- Duplicate detection (geospatial proximity)
- 1‑year data retention + archival policy
- Accessible UI (ARIA, high contrast, touch ≥44px)

## 🧱 Architecture (High-Level)

Frontend (Next.js 14 + App Router + Tailwind + shadcn/ui)

- PWA shell (manifest + service worker in `frontend/public`)
- Offline queue (`src/lib/offlineQueue.ts`) & sync manager
- IndexedDB persistence (`src/lib/db.ts`)
- Map & geolocation services (`services/mapbox.ts`, `hooks/useGeolocation.ts`)

Backend (Express + PostgreSQL/PostGIS)

- REST API (`/api/v1/...`) in `backend/src/routes`
- Data models & validation (`backend/src/models`)
- Duplicate detection (`services/duplicateDetector.ts`)
- Data retention job (`services/dataRetention.ts`)
- Rate limiting (`middleware/rateLimiter.ts`)

External Services

- Clerk (admin auth only)
- Cloudinary (media storage)
- Mapbox (maps + geocoding)
- Neon (managed Postgres prod target)

## 🚀 Quick Start (Development)

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with PostGIS
- Git

### 1. Clone & Install

```bash
git clone <repository-url>
cd fix-my-barangay

cd frontend ; npm install
cd backend ; npm install
```

### 2. Environment Variables

Copy or create `.env.local` for each app (templates provided once generated):

Frontend (`frontend/.env.local`):

```

NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/admin/sign-up
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.ey...
```

Backend (`backend/.env.local`):

```
PORT=3001
POSTGRES_URL=postgresql://postgres:password@localhost:5432/fixmybarangay
NEON_DATABASE_URL=postgresql://user:pass@host/db
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 3. Database Init

```bash
# Create database
psql -U postgres
CREATE DATABASE fixmybarangay;

# Run migrations
psql -d fixmybarangay -f backend/database/schema.sql
```

### 4. Run Dev Servers (two terminals)

```bash
cd backend ; npm run dev
cd frontend ; npm run dev
```

### 5. Verify

- Frontend: http://localhost:3000
- API Health: http://localhost:3001/health
- Submit a sample report; inspect network calls.

## 🔌 Key API Endpoints (v1)

Base: `http://localhost:3001/api/v1`

Public

- POST /reports – create report (category, description, location, optional photo urls)
- GET /reports – list (filters: category, status, limit, offset)
- GET /reports/:id – detail
- POST /upload/image – upload single image (multipart field `file`)

Admin (Clerk auth)

- GET /admin/reports – paginated moderation list
- PUT /admin/reports/:id – update status, notes, duplicate linkage
- PATCH /admin/reports/:id/status – status-only shortcut
- DELETE /admin/reports/:id – remove (admin role)
- GET /admin/stats – metrics scaffold

Rate Limits

- 5 report submissions / IP / hour
- 20 report submissions / IP / day

## 🗃 Data Model Highlights

Report

- category: Infrastructure | Sanitation | Safety | Water | Electrical
- status flow: Submitted → In Review → In Progress → Resolved → Closed
- location: PostGIS point (with optional human-readable address)
- duplicate_of: self-reference for consolidation

Retention & Integrity

- Archive after 1 year (policy defined; job stub present)
- Duplicate proximity heuristic (≈100m + same category)

## 📦 Scripts

Backend

- npm run dev – watch mode (ts-node + nodemon)
- npm run build – compile TypeScript
- npm run migrate – apply schema
- npm run migrate:verify – structural + index checks

Frontend

- npm run dev – Next.js dev server
- npm run build – Production build
- npm run start – Start production server (after build)

## 📱 PWA & Offline

- Service worker: `public/sw.js` (app shell + form caching)
- Manifest: `public/manifest.json`
- IndexedDB queue: resilient offline submissions
- Sync strategy: attempt on focus + connection regain

## 🔐 Security & Privacy

- Minimal personal data (no user accounts for reporters)
- IP captured only for rate limiting
- Helmet + CORS configured
- Graceful degradation if Cloudinary / Mapbox / Clerk unavailable

## ♿ Accessibility

- ARIA roles and labels on form & dynamic components
- High contrast styles in `styles/accessibility.css`
- Touch target sizing audit passed (≥44px)

## 📊 Current MVP Status

| Area                        | Status      |
| --------------------------- | ----------- |
| Core reporting              | ✅ Complete |
| Offline queue + sync        | ✅ Complete |
| Admin moderation            | ✅ Complete |
| Analytics dashboard (basic) | ✅ Initial  |
| Accessibility               | ✅ MVP Pass |
| Deployment hardening        | ✅ Ready    |

## 🧪 Testing

Manual test procedures documented (see `docs/testing/README.md`).

Core validated scenarios:

- Online submission
- Offline queue & sync
- Admin moderation & status update
- Duplicate detection flagging
- PWA install & offline fallback
- Accessibility (ARIA + keyboard + contrast)

## 📤 Deployment Checklist (Condensed)

1. Neon Postgres provisioned & schema applied
2. Backend (Vercel) (HTTPS + health check green)
3. Frontend (Vercel) pointed to API base URL
4. Environment variables set (frontend + backend)
5. Security headers review (Helmet baseline OK)
6. Lighthouse PWA audit >90 (offline + install) confirmed
7. Manual test suite pass
8. Ready for production domain binding
