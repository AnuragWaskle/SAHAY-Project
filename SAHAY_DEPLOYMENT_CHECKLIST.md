# Sahay Platform — Production Deployment Checklist

Use this checklist to track step-by-step readiness before, during, and after deploying Sahay to production.

---

## 1. Pre-Deployment Audit & Repository Hygiene
- [x] **Folder Structure Verified**: Identified workspace components (`apps/api`, `apps/ai-services`, `apps/web`, `apps/real_mobile_application`, `infra/db`).
- [x] **No Secrets in Source**: Verified source files and Git tracking exclude `.env`, passwords, and private tokens.
- [x] **Zero TypeScript Errors**: Passed `npx tsc --noEmit` across `apps/api` and `apps/real_mobile_application`.
- [x] **Zero Build Errors**: Passed `npx vite build` for `apps/web`.

---

## 2. Database Deployment (PostgreSQL + PostGIS)
- [ ] **Provision Managed DB Instance**: Created PostgreSQL instance on Render / Supabase / Aiven.
- [ ] **Enable PostGIS Extension**: Executed `CREATE EXTENSION IF NOT EXISTS postgis;`.
- [ ] **Apply Schema**: Executed schema script `infra/db/001_initial_schema.sql`.
- [ ] **Seed Administrative Baseline**: Executed `infra/db/002_seed_bhopal.sql`.
- [ ] **SSL Configuration**: Verified `DATABASE_URL` uses SSL parameters (`?sslmode=require` or SSL object).

---

## 3. AI Service Deployment (FastAPI + DINOv2 — Render)
- [ ] **Create Render Web Service**: Root directory `apps/ai-services`, runtime Python 3.10+.
- [ ] **Build Command**: `pip install -r requirements.txt`.
- [ ] **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- [ ] **Configure Environment Variables**: Set `NVIDIA_API_KEY`, `NVIDIA_MODEL`, and `DATABASE_URL`.
- [ ] **Verify Health Check**: Test `GET https://<RENDER_AI_URL>/healthz` returns `{"status": "ok"}`.

---

## 4. Backend API Deployment (Express + Socket.IO — Render)
- [ ] **Create Render Web Service**: Root directory `apps/api`, runtime Node.js 18+.
- [ ] **Build Command**: `npm install && npm run build`.
- [ ] **Start Command**: `npm start` (`node dist/index.js`).
- [ ] **Configure Environment Variables**: Set `DATABASE_URL`, `AI_SERVICES_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `PORT`.
- [ ] **Verify Health Check**: Test `GET https://<RENDER_API_URL>/healthz` returns `{"status": "ok"}`.

---

## 5. Web Frontend Deployment (React / Vite — Vercel)
- [ ] **Create Vercel Project**: Root directory `apps/web`.
- [ ] **Build Command**: `npm run build` (`tsc && vite build`).
- [ ] **Output Directory**: `dist`.
- [ ] **Configure Environment Variables**: Set `VITE_API_URL=https://<RENDER_API_URL>/api/v1`.
- [ ] **Configure SPA Rewrites**: Added `vercel.json` rewrites for client-side routing.
- [ ] **Verify Production Web**: Test login, dashboard navigation, and API response headers.

---

## 6. Mobile Application Build (Expo / EAS)
- [ ] **EAS Configuration**: Configured `eas.json` with production profile.
- [ ] **Environment Variables**: Injected `EXPO_PUBLIC_API_URL=https://<RENDER_API_URL>/api/v1`.
- [ ] **Generate Android APK/AAB**: Executed `eas build --platform android --profile production`.
- [ ] **Device Installation & E2E Test**: Tested real APK on physical Android device connecting to live production API.

---

## 7. Post-Deployment E2E Verification
- [ ] **Citizen Registration & Login**: Verified JWT issuance and authentication flow.
- [ ] **Camera & GPS Location Capture**: Verified live report creation with GPS address resolution.
- [ ] **⚡ AI Vision Verification**: Verified DINOv2 verification and confidence scoring.
- [ ] **NGO Work Claim & Completion**: Verified NGO work claim, before/after evidence upload.
- [ ] **Web Admin Dashboard Sync**: Verified real-time update on Admin Panel.
