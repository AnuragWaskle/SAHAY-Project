# Sahay Application Setup & Run Commands

You can run the different services of the Sahay platform by opening separate terminal windows, navigating to the workspace, and executing the corresponding commands below:

### 1. Database Seed (Optional - Run once to populate demo data)
```bash
cd "/home/anurag-waskle/Documents/september hackathon/sahay/apps/api"
npm run seed
```

### 2. Backend API Server (Runs on http://localhost:3000)
```bash
cd "/home/anurag-waskle/Documents/september hackathon/sahay/apps/api"
npm run dev
```

### 3. AI FastAPI Services (Runs on http://localhost:8001)
```bash
cd "/home/anurag-waskle/Documents/september hackathon/sahay/apps/ai-services"
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001
```

### 4. Web Dashboard Frontend (Runs on http://localhost:5173)
```bash
cd "/home/anurag-waskle/Documents/september hackathon/sahay/apps/web"
npm run dev
```

### 5. Mobile Expo Client (Runs Metro Bundler on http://localhost:8081)
```bash
cd "/home/anurag-waskle/Documents/september hackathon/sahay/apps/mobile"
npm run start
```

---

# Sahay Demo User Credentials

Use the following Firebase UID tokens in dev mode to sign in under different roles. In the Web Dashboard, clicking the corresponding "Login as..." button automatically loads the correct token. On the Mobile client, the token defaults to `demo_citizen_1`.

| Role | Name | Demo Token / Firebase UID | Description |
|---|---|---|---|
| **Super Admin** | Sahay Admin | `demo_super_admin` | Full platform control, moderation, and verification approval. |
| **Sub Admin** | Rahul Sharma | `demo_sub_admin` | General platform manager. |
| **Municipal Officer** | Smt. Priya Mishra | `demo_officer_1` | Road maintenance issues, status updates, work orders. |
| **Municipal Officer** | Shri Rajesh Tiwari | `demo_officer_2` | Drainage and sewage maintenance. |
| **Elected Rep** | Corporator Sunita Patel | `demo_elected` | Ward 12 representative, views analytics and endorses petitions. |
| **NGO Owner** | Bhopal Green Foundation | `demo_ngo_1` | Adopts civic projects and launches volunteer cleanups. |
| **NGO Owner** | Narmada Sewa Trust | `demo_ngo_2` | Adopts water and sanitation projects. |
| **Active Citizen** | Aditya Verma | `demo_citizen_1` | Active citizen with gold star badge and 2450 points. |
| **Verified Citizen** | Pooja Singh | `demo_citizen_2` | Verified citizen with grey check badge and 850 points. |

## How Dev Auth Works

When running in `NODE_ENV=development`, the backend auth middleware accepts `Bearer demo_<uid>` directly without verifying Firebase credentials, mapping it to the corresponding seeded database record.
