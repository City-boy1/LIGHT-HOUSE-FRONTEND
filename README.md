# Lighthouse Church — Frontend

Public website + admin dashboard for Lighthouse Church. Static HTML/CSS/JS, deployed on **Vercel**. Talks to the separately-deployed backend API on Render.

## Structure

```
index.html, app.js, ...        — public website
admin/dashboard.html            — admin dashboard
admin/dashboard.js
admin/dashboard.css
config.js                       — API base URL config (see below)
```

## Local Development

No build step — just serve the folder (e.g. VS Code "Live Server", or `npx serve`) and open in browser. Both `config.js` and `dashboard.js` detect `localhost`/`127.0.0.1` automatically and point at `http://localhost:5000/api`, so the backend must be running locally too (see backend README).

## ⚠️ Required Before Deploying

Both of these files hardcode `'/api'` as the production fallback, which assumes the frontend and backend share the same domain. **They don't** — frontend is on Vercel, backend is on Render, different domains. You must update both:

**`config.js`:**
```js
API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://your-actual-backend.onrender.com/api',   // ← set this
```

**`admin/dashboard.js`:**
```js
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://your-actual-backend.onrender.com/api';   // ← set this
```

If you skip this, the deployed site will fail to load any data — it'll try to call its own Vercel domain for `/api/...` and get 404s.

## Deploying to Vercel

1. Push to GitHub, import the repo in Vercel.
2. No build command needed (static site) — set Framework Preset to "Other" if Vercel tries to auto-detect a framework.
3. Deploy.
4. **Then go update `FRONTEND_URL` on the Render backend** to match this new Vercel URL exactly (no trailing slash), or the backend's CORS allowlist will reject requests from it. See backend README.

## Admin Dashboard Notes

- Auth token (`church_token`) and admin info (`church_admin`) are stored in `localStorage`, set on login (`/admin/login.html`) and read throughout `dashboard.js`. Cleared on logout.
- Every create/update form goes through `openModal()` → `saveItem()`. `saveItem()` has a save-in-progress guard (`isSaving`) to prevent duplicate submissions from impatient double-clicking — don't remove this when editing the function.
- Any text field that originates from a **public, unauthenticated** form (prayer requests, contact messages) must be passed through `esc()` before being inserted via `innerHTML` anywhere in the dashboard. This is already done for existing fields — keep the pattern for new ones.
- File upload inputs (member photos, sermon media, gallery images, pastor photos, ministry media) all hit endpoints that enforce server-side size limits — don't rely on frontend-only validation for these.

## Updating Later

Since both sides redeploy independently:
- Pure frontend change (copy, layout, new dashboard feature using existing endpoints) → push to the frontend repo, Vercel redeploys, done.
- New backend route or changed response shape → update backend repo first, deploy to Render, confirm `/api/health` and the specific endpoint work, **then** update frontend code that calls it.
- Changing CORS-relevant URLs (new frontend domain, custom domain swap) → update `FRONTEND_URL` on Render, not just the frontend.