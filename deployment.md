# SAHAY Platform: Complete Deployment Guide

This document outlines the step-by-step procedure to deploy the entire Sahay architecture, piece by piece. Since Sahay is a multi-service system, order matters. You must deploy the foundational layers (Database and AI) before the backend, and the backend before the frontends.

---

## ✅ Phase 1: Database Setup (COMPLETED)

We have already completed this phase. Your Render PostgreSQL instance (`sahay_db`) is live.
- PostGIS extension is enabled.
- The schema is fully applied.
- The dummy seed data was intentionally skipped to keep your production DB clean.

*Your Render Internal Database URL:* `postgresql://sahay_db_user:9nuu0e6ob9Wv1I54mX8VJQdfMvnDpoEs@dpg-daktu3e7bikc738ml900-a/sahay_db`

---

## 🚀 Phase 2: AI Microservice Deployment (Render)

This service runs the Nemotron LLM and DINOv2 vision models. It must be deployed before the main API.

1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository (`AnuragWaskle/SAHAY-Project`).
4. **Configuration**:
   - **Name**: `sahay-ai-service` (or similar)
   - **Root Directory**: `apps/ai-services`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**:
   - `DATABASE_URL`: *(Paste the Internal Database URL from Phase 1 above)*
   - `NVIDIA_API_KEY`: *(Paste your NVIDIA Nemotron API Key)*
6. Click **Deploy Web Service**.
7. **Action Item**: Once the deploy finishes, copy the public URL provided by Render (e.g., `https://sahay-ai-service.onrender.com`). You will need this for the next phase.

---

## 🚀 Phase 3: Main API Backend Deployment (Render)

This is your Express.js backend that handles mobile and web traffic.

1. Go back to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect the same GitHub repository.
4. **Configuration**:
   - **Name**: `sahay-api` (or similar)
   - **Root Directory**: `apps/api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. **Environment Variables**:
   - `DATABASE_URL`: *(Paste the Internal Database URL from Phase 1)*
   - `AI_SERVICES_URL`: *(Paste the URL you copied at the end of Phase 2)*
6. Click **Deploy Web Service**.
7. **Action Item**: Once deployed, copy this public URL (e.g., `https://sahay-api.onrender.com`). Verify it works by visiting `https://<YOUR-API-URL>/healthz` in your browser.

---

## 🚀 Phase 4: Admin Web Dashboard Deployment (Vercel)

This is the React control panel for city officials and admins.

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New Project** and import your GitHub repository.
3. **Configuration**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and select `apps/web`.
4. **Environment Variables**:
   - `VITE_API_URL`: *(Paste the API URL from Phase 3, followed by `/api/v1` - e.g., `https://sahay-api.onrender.com/api/v1`)*
5. Click **Deploy**.
6. **Action Item**: Once complete, your Admin dashboard is live! You can log in using your admin credentials. 

*(Note: Once Vercel gives you your final `.vercel.app` URL, you should go back to your API service in Render, add an environment variable `CORS_ORIGINS=https://your-vercel-app-url.vercel.app`, and redeploy the API so it securely accepts traffic from your admin dashboard).*

---

## 🚀 Phase 5: Mobile App Deployment (Expo EAS)

The mobile app cannot be deployed to a web server. It must be built into an Android `.apk` or `.aab` file.

1. Open your terminal locally and navigate to the mobile folder:
   ```bash
   cd apps/real_mobile_application
   ```
2. Make sure you are logged into EAS (Expo Application Services):
   ```bash
   npx eas login
   ```
3. Initialize your build configuration (if not already done):
   ```bash
   npx eas build:configure
   ```
4. Set your production API URL in your `.env` or as a terminal variable. Since it's a mobile app, the environment variable must be baked in during the build process:
   ```bash
   EXPO_PUBLIC_API_URL=https://sahay-api.onrender.com/api/v1 npx eas build --platform android --profile preview
   ```
   *(Make sure to replace the URL with your actual Render API URL from Phase 3)*
5. Wait for the build to finish. EAS will provide you with a link or a QR code to download the `.apk` file.
6. **Action Item**: Download the `.apk`, install it on your physical Android phone, and test the full citizen reporting flow!
