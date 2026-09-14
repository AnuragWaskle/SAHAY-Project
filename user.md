# Sahay Project - Run Commands

To start the full Sahay application, you will need to open **four separate terminals**. Navigate to the root directory (`/home/anurag-waskle/Documents/september hackathon/sahay`) in each terminal, and run the following commands:

## 1. Backend Server
In the first terminal, start the Python backend:
```bash
cd apps/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

## 2. AI Service
In the second terminal, start the AI processing service:
```bash
cd apps/ai_service
source .venv/bin/activate
uvicorn main:app --reload --port 8002
```

## 3. Web Dashboard (Frontend)
In the third terminal, start the React Web application:
```bash
cd apps/web
npm run dev
```
cd cd
## 4. Mobile Application
In the fourth terminal, start the Expo mobile app:
```bash
cd apps/mobile
npx expo start
```
*(Press `a` to open on an Android emulator or `i` for iOS simulator once the Expo menu loads)*

## Seeding Demo Data (Optional)
If you need to seed initial users and demo data to test the dashboards, you can run this command while the backend is running:
```bash
cd apps/backend
source .venv/bin/activate
python seed_db.py
```
