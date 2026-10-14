# Setup Guide

## Prerequisites

| Tool    | Version  | Notes                                     |
|---------|----------|-------------------------------------------|
| Node.js | 20+      | [nodejs.org](https://nodejs.org)          |
| npm     | 9+       | Comes with Node.js                        |
| Git     | any      |                                           |

## 1. Clone & Install Dependencies

```bash
git clone <repo-url> facebook-automation
cd facebook-automation

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 2. Environment Variables

Create `backend/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database (SQLite path)
DATABASE_URL="file:./dev.db"

# Paths (relative to backend/)
SESSIONS_DIR=./sessions
UPLOADS_DIR=./uploads
LOGS_DIR=./logs

# Playwright
PLAYWRIGHT_HEADLESS=false     # false = headed mode for session setup
BROWSER_SLOW_MO=50            # ms between actions (human-like pacing)

# CORS - frontend URL
CORS_ORIGIN=http://localhost:5173
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api/v1
```

## 3. Database Setup

```bash
cd backend

# Run Prisma migrations (creates dev.db automatically)
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

## 4. Create Required Directories

```bash
cd backend
mkdir -p sessions uploads logs
```

## 5. Running the Development Servers

Open two terminals:

**Terminal 1 – Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:3001
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
# Dashboard opens at http://localhost:5173
```

## 6. First-Time Session Setup

1. Open the dashboard at `http://localhost:5173`
2. Go to **Session** page
3. Click **"Setup New Session"**, enter a name (e.g. `Main Account`)
4. A Chrome browser window will open — **log in to Facebook manually**
5. Complete any 2FA if prompted
6. Once logged in and on the Facebook home page, click **"Confirm Login"** in the dashboard
7. The session is now saved. The browser will close automatically.

You only need to redo this when your session expires (typically every 30–90 days).

## 7. Running in Production

```bash
# Build frontend
cd frontend
npm run build
# Static files go to frontend/dist/

# Build backend
cd backend
npm run build
# Compiled JS goes to backend/dist/

# Start production server (serves both API and static frontend)
cd backend
npm start
```

The production server serves the frontend build at `/` and the API at `/api/v1`.

## 8. Updating

```bash
git pull

cd backend
npm install
npx prisma migrate deploy   # Apply any new DB migrations
npm run build

cd ../frontend
npm install
npm run build
```

## Troubleshooting

| Problem                         | Solution                                                      |
|---------------------------------|---------------------------------------------------------------|
| `Browser not found`             | Run `npx playwright install chromium`                         |
| `Session expired`               | Redo the Session Setup flow (Step 6)                          |
| `Port already in use`           | Change `PORT` in `backend/.env`                               |
| `Prisma migration failed`       | Delete `backend/dev.db` and rerun `prisma migrate dev`        |
| Posts fail with `selector error`| Facebook may have updated their UI — check GitHub for updates |
