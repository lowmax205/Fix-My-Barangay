# Backend API – Fix My Barangay

Express + TypeScript service powering civic issue reporting, moderation, media upload, and geospatial duplicate detection.

## 🔧 Stack

- Express 5 (TypeScript)
- PostgreSQL 14 + PostGIS (geospatial)
- Cloudinary (images)
- Clerk (admin authentication)
- Helmet, CORS, morgan (security & logging)

Health check: http://localhost:3001/health

## 🗂 Structure

```
src/
  index.ts                # App bootstrap
  db/connection.ts        # PG pool & initialization
  models/                 # Report / Category / Location validation
  routes/                 # REST endpoints (reports, admin, upload)
  services/               # Cloudinary, duplicate detection, retention
  middleware/             # Rate limiting, adminAuth
scripts/
  migrate.js              # Simple migration runner
  verify.js               # Schema verification script
```

## 📥 Public Endpoints

| Method | Path          | Description                                             |
| ------ | ------------- | ------------------------------------------------------- |
| POST   | /reports      | Create new report (rate limited)                        |
| GET    | /reports      | List reports (filters: category, status, limit, offset) |
| GET    | /reports/:id  | Fetch single report                                     |
| POST   | /upload/image | Upload single image (multipart field: file)             |

### Submit Report (POST /reports)

Request JSON:

```json
{
  "category": "Infrastructure",
  "description": "Broken streetlight on National Highway",
  "location": { "lat": 00.0000, "lng": 000.0000 },
  "address": "National Highway, Barangay Luna",
  "photo_url": "https://res.cloudinary.com/.../image.jpg",
  "photo_public_id": "reports/abc123"
}
```

Success 201:

```json
{ "success": true, "data": { "id": "uuid", "status": "Submitted", ... }, "duplicates": [], "message": "Report submitted successfully" }
```

## 🛡 Rate Limiting

- 5 reports / IP / hour
- 20 reports / IP / day
  Middleware: `middleware/rateLimiter.ts`

## 🛰 Admin Endpoints (Clerk Auth Required)

| Method | Path                      | Notes                              |
| ------ | ------------------------- | ---------------------------------- |
| GET    | /admin/reports            | Moderation list                    |
| PUT    | /admin/reports/:id        | Update status, notes, duplicate_of |
| PATCH  | /admin/reports/:id/status | Status-only convenience            |
| DELETE | /admin/reports/:id        | Hard delete (admin role)           |
| GET    | /admin/stats              | Metrics scaffold                   |
| POST   | /admin/users              | Create admin user (admin role)     |

Auth Flow: `middleware/adminAuth.ts` resolves Clerk user → attaches `req.clerkUserId` & `req.adminRole`.

## 🧬 Data Model (Report)

Fields: id, category, description, location(point), address, photo_url, status, reporter_ip, admin_notes, duplicate_of, timestamps.

Statuses: Submitted → In Review → In Progress → Resolved → Closed

## 🔁 Duplicate Detection

Service: `services/duplicateDetector.ts`

- Heuristic: Nearby (≈100m) + same category recent reports → flagged & returned in POST response.

## 🗓 Data Retention

Service: `services/dataRetention.ts`

- Policy: Archive / purge after 1 year (job wiring pending production scheduler)

## 🖼 Image Upload

Route: `POST /upload/image`

- Multer in-memory → Cloudinary streaming
- 10MB max file size (enforced by Multer)

## 🔒 Security Considerations

- Helmet headers
- Input validation on category/status/description
- UUID validation for resource IDs
- Graceful degradation if Cloudinary unavailable (503 response)

## 🚀 Deployment Notes

- Enable PostGIS extension in production DB
- Provide `NEON_DATABASE_URL` / switch pool connection string
- Add HTTPS termination (platform or reverse proxy)
- Add structured logging + error reporting (future)

## ✅ MVP Status (Backend)

| Area                | Status |
| ------------------- | ------ |
| Core CRUD           | ✅     |
| Rate limiting       | ✅     |
| Uploads             | ✅     |
| Admin moderation    | ✅     |
| Duplicate detection | ✅     |
