## Frontend (PWA) – Fix My Barangay

Next.js 14 + App Router implementation for the civic issue reporting Progressive Web App.

### ✨ Responsibilities

- Public reporting interface (submit + browse + map)
- Offline queue + background sync
- Installable PWA (manifest + service worker)
- Admin UI (Clerk auth) for moderation & analytics
- Accessibility & mobile-first UI

### 🗂 Key Files

| Area               | Path                                 |
| ------------------ | ------------------------------------ |
| Global layout      | `src/app/layout.tsx`                 |
| Home / submit page | `src/app/page.tsx`                   |
| Report detail page | `src/app/reports/[id]/page.tsx`      |
| Admin dashboard    | `src/app/admin/page.tsx`             |
| Analytics          | `src/app/admin/analytics/page.tsx`   |
| Service worker     | `public/sw.js`                       |
| Manifest           | `public/manifest.json`               |
| Offline fallback   | `public/offline.html`                |
| IndexedDB helper   | `src/lib/db.ts`                      |
| Offline queue      | `src/lib/offlineQueue.ts`            |
| Sync manager       | `src/lib/syncManager.ts`             |
| Mapbox service     | `src/services/mapbox.ts`             |
| Geolocation hook   | `src/hooks/useGeolocation.ts`        |
| Image utils        | `src/lib/imageUtils.ts`              |
| Advanced filters   | `src/components/AdvancedFilters.tsx` |

### 🔧 Environment (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.ey...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/admin/sign-up
```

### 🚀 Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

### 🧱 Component Highlights

- `ReportForm` – validates inputs, integrates geolocation + Cloudinary URLs
- `ReportsList` – paginated list + status/category filters
- `MapView` – interactive markers (Mapbox GL wrapper / placeholder if token missing)
- `LocationSelector` + `ManualLocationPicker` – auto vs manual coordinate selection
- `OfflineStatus` – indicator + manual sync trigger
- `MetricsGrid` – admin analytics counts scaffold

### 📦 Build & Production

```bash
npm run build
npm run start   # serves .next/ output
```

### 📱 PWA Behavior

- App shell & form routes cached
- Offline submission stored in IndexedDB queue
- Sync attempts on: regain network, window focus, explicit user action
- `offline.html` served when route not cached

### ♿ Accessibility

- ARIA labels on interactive controls
- High contrast styles in `src/styles/accessibility.css`
- Minimum 44px hit targets enforced in button components

### 🔐 Auth (Admin Only)

- Clerk provider initialization in `src/lib/clerk.tsx`
- Admin routes render sign-in redirection if not authenticated
- Public reporting flow does NOT require login

### 🛣 Post-MVP Ideas (Future Backlog)

- Lazy image component for report thumbnails
- Performance / error analytics instrumentation
- Localization (i18n)

### ✅ Frontend MVP Status

| Feature             | Status |
| ------------------- | ------ |
| Report submission   | ✅     |
| Offline queue       | ✅     |
| Map view            | ✅     |
| Advanced filters    | ✅     |
| Admin moderation UI | ✅     |
| Analytics basics    | ✅     |
| PWA install/offline | ✅     |
| Accessibility pass  | ✅     |
| Deployment ready    | ✅     |
