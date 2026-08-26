# 🇮🇳 Sahay (सहाय) — Civic Participation & Intelligence Platform

> **The Citizen-Powered Civic Intelligence Layer for Indian Cities**
> 
> Sahay (formerly CivicPulse AI) is a next-generation civic participation, problem intelligence, action, and accountability platform. Unlike traditional 1:1 grievance ticketing portals (like CPGRAMS), Sahay connects Citizens, NGOs, Businesses (CSR), Residents' Welfare Associations (RWAs), and Municipal/Govt bodies in a collaborative network. 

---

## 🏗️ System Architecture

Sahay is organized as a monorepo consisting of modern React/Node/Python components:

```
sahay/
  ├── apps/
  │   ├── mobile/        # React Native + Expo (Citizen-facing App)
  │   ├── web/           # React + Vite (Gov, NGO, CSR, RWA, & Admin Dashboards)
  │   ├── api/           # Node.js + Express + Socket.io Backend API
  │   └── ai-services/   # Python FastAPI microservices (8 AI Engines)
  ├── packages/
  │   └── shared-types/  # Shared TypeScript models and interfaces
  └── infra/
      ├── db/            # Database schema migrations & seed SQL
      └── docker/        # PostgreSQL/PostGIS & MinIO compose configurations
```

---

## 🛠️ Technology Stack

| Layer | Technology | Key Details |
|---|---|---|
| **Frontend Mobile** | React Native (Expo) | Cross-platform citizen application, offline capability, map views. |
| **Frontend Web** | React + Vite | Multi-role dashboards, responsive layouts, real-time charts. |
| **Backend API** | Node.js + Express | REST APIs, Socket.io for real-time events, RBAC middleware. |
| **AI Microservices** | Python + FastAPI | 8 distinct AI pipelines processing text, voice, images, & GIS data. |
| **Database** | PostgreSQL + PostGIS | Relational database with full geospatial operations (indexing & queries). |
| **Authentication** | Firebase Auth | Phone OTP verified access (primary) + Email. Linked to DB user profiles. |
| **Storage** | MinIO / Local FS | S3-compliant object store for photo & video evidence. |

---

## 🤖 The 8 Core AI Engines

Sahay uses AI not to replace human decision-making, but to structure, filter, prioritize, and verify civic data:

1. **Voice Engine (Speech-to-Text):** Processes multilingual citizen reports (Hindi, English, and regional languages) using speech-to-text to make reporting accessible for low-literacy users.
2. **NLU Engine (Natural Language Understanding):** Structurizes unstructured report texts/transcripts into categorized attributes (e.g., Waste, Roads, Water, Safety), severity flags, and affected-group metrics.
3. **Vision Engine (Image Classification & Comparison):** Identifies the type of issue (pothole, trash heap, broken light) from photos and performs automated before-and-after resolution comparisons.
4. **Clustering Engine (Geospatial & Semantic Clustering):** Uses PostGIS spatial indexing and NLP text embeddings to group multiple reports of the same physical problem into a single "Civic Incident", avoiding duplicate ticketing.
5. **Priority Engine (Civic Priority Scoring):** Automatically calculates a weighted priority score based on safety impacts, citizen support, population density, and user verification weight.
6. **Root-Cause Engine (Systemic Co-location Analysis):** Correlates co-located incidents across categories (e.g., repeated water pipe bursts leading to pothole erosion) to identify systemic problems.
7. **Prediction Engine (Risk Forecasting):** Predicts high-risk areas per ward/category by evaluating historical reports, seasonal weather feeds (e.g., monsoon waterlogging risks), and city sensor feeds.
8. **Verification Engine (Resolution Confidence):** Computes a resolution confidence score using AI image comparison, location proximity checks, and citizen verification feedback.

---

## 👥 Roles & Verification Badges

Sahay maintains a strict trust-based permissions system verified by automated checks and sub-admin moderation:

*   **👤 Citizen (Unverified):** Can browse reports and map hotspots.
*   **🔷 Verified Citizen (Grey Check):** Document or Aadhaar OTP verified. Higher weight on votes and reports.
*   **⭐ Civic Leader (Gold Star):** Citizens with high impact scores. Can lead "Civic Circles" and host local missions.
*   **🟢 NGO (Green Tick):** Verified non-profit. Dashboard to claim initiatives, recruit volunteers, and run campaigns.
*   **🟢 Company/CSR (Green Tick):** Corporate entities matching CSR budgets to verified civic projects.
*   **🟢 Society/RWA (Green Tick):** Local residential societies managing localized problems.
*   **✅ Municipal Officer (Blue Tick):** Verified ULB officers who receive work orders, post updates, and route jobs.
*   **✅ Elected Representative (Blue Tick):** MLAs, MPs, and Corporators responding to constituency demands.
*   **✅ Police / Law Enforcement (Blue Tick):** Handling safety-critical or SOS issues.

---

## 🚀 Getting Started (Local Development)

Follow these steps sequentially to run the Sahay monorepo locally.

### Prerequisites
*   Node.js (v18+) & `npm`
*   Python (3.10+) & `pip`
*   Docker & Docker Compose

---

### Step 1: Start the Infrastructure Services
Deploy the PostgreSQL database (with PostGIS enabled) and the MinIO object store using Docker:
```bash
cd infra/docker
docker compose up -d
```
*Database will run on port `5434`, MinIO API on `9002`, and MinIO Console on `9003`.*

---

### Step 2: Database Migration & Bhopal Demo Seed
Setup the schema and seed the database with a high-fidelity dataset of Bhopal (wards, officials, historical data, 200+ sample reports, and incidents):
```bash
cd apps/api
# Copy configuration sample
cp ../../.env.example .env
# Edit .env variables (set DATABASE_URL to postgres://postgres:postgres@localhost:5434/sahay)
npm install
npm run migrate
npm run seed
```

---

### Step 3: Run the Node.js API
Start the primary backend Express API with Socket.io:
```bash
cd apps/api
npm run dev
```
*API runs on `http://localhost:3000`.*

---

### Step 4: Start Python AI Services
Create a virtual environment, install Python dependencies, and run the FastAPI app:
```bash
cd apps/ai-services
python -m venv .venv
source .venv/bin/activate # (Or .venv\Scripts\activate on Windows)
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
*AI services will run on `http://localhost:8001`.*

---

### Step 5: Start the Web Dashboard
Install and run the Vite-based React dashboard for Government, NGO, and Admin roles:
```bash
cd apps/web
npm install
npm run dev
```
*Dashboards run on `http://localhost:5173`.*

---

### Step 6: Start the Mobile App (Citizen)
Install Expo CLI dependencies and boot the React Native bundler:
```bash
cd apps/mobile
npm install
npx expo start
```
*Expo developer tools will start on port `8081`.*

---

## 📬 Default Ports Quick Reference

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | `5434` | DB with PostGIS Extension |
| **MinIO API** | `9002` | S3-compatible Object Storage |
| **MinIO Console** | `9003` | Admin Storage UI |
| **Node.js API** | `3000` | Core Express Backend API |
| **Python FastAPI** | `8001` | AI Microservices |
| **Web Dashboard** | `5173` | React Web app |
| **Expo Dev Server** | `8081` | Mobile App Metro Bundler |

---

## 🔒 Security & Privacy
*   **Token Authentication:** Firebase ID tokens verified on the Node backend.
*   **Geospatial Privacy:** Citizen report coordinates are offset dynamically on public maps to protect user privacy (fuzzy coordinates), while maintaining exact details for municipal work orders.
*   **Integrity Channel:** Direct whistleblower pipeline for misconduct/corruption reports, bypassing local departments directly to Super Admins.
