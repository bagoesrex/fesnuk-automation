# Setup Guide

## Prerequisites

| Tool | Version | Notes                              |
|------|---------|------------------------------------|
| Bun  | 1.x+    | [bun.sh](https://bun.sh)           |
| Git  | any     |                                    |

Install Bun (if not already):

```bash
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS / Linux
curl -fsSL https://bun.sh/install | bash
```

## 1. Clone & Install Dependencies

```bash
git clone <repo-url> facebook-automation
cd facebook-automation

# Install backend dependencies
cd backend
bun install

# Install frontend dependencies
cd ../frontend
bun install
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

# Auth & Security (Optional for local testing; leave blank to disable auth)
ADMIN_PASSWORD=your-super-strong-password
JWT_SECRET=your-random-jwt-secret-min-32-chars

# Playwright
PLAYWRIGHT_HEADLESS=false     # false = headed mode for local session setup; true on VPS
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

# Run Prisma migrations (creates dev.db and applies existing migrations)
bunx prisma migrate deploy

# Generate Prisma Client types
bunx prisma generate

# (Optional) Open Prisma Studio to inspect data
bunx prisma studio
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
bun run dev
# Server starts at http://localhost:3001
```

**Terminal 2 – Frontend:**
```bash
cd frontend
bun run dev
# Dashboard opens at http://localhost:5173
```

## 6. First-Time Session Onboarding

Open `http://localhost:5173` and log in with your `ADMIN_PASSWORD` (if configured).

### Option A: Local Headed Login
1. Navigate to the **Session** page.
2. Click **"Setup New Session"**, enter an Account Name (e.g. `Main Account`) and optional proxy.
3. A Chromium window opens — log in to Facebook manually and pass any 2FA challenge.
4. Once on the Facebook feed, click **"Confirm Login"** in the dashboard.
5. The session is saved to `backend/sessions/<account-id>.json`.

### Option B: Headless VPS Session Import
1. In your local development machine, export the session JSON via `GET /accounts/:id/session` (or dashboard Export button).
2. On your VPS dashboard, go to **Session** page and click **"Import Session"**.
3. Paste the Playwright `storageState` JSON or cookie array, enter the Account Name, and set your residential/mobile proxy URL.
4. Click **"Save Session"**. The account is immediately ready without needing a desktop display.

### Multi-Account Workspace Switching
- Once an account is saved, use the **Topbar Account Switcher** at the top right of the dashboard.
- Switching the active account automatically refreshes all Groups, Posts, Schedules, and Logs scoped strictly to that account.

## 7. Running Integration Tests

```bash
cd backend
bun test
```

## 8. Running in Production

```bash
# Build frontend
cd frontend
bun run build
# Static files generated in frontend/dist/

# Build backend
cd backend
bun run build
# Compiled bundle in backend/dist/

# Start production server
cd backend
bun start
```

## 9. Updating

```bash
git pull

cd backend
bun install
bunx prisma migrate deploy   # Apply any new DB migrations
bunx prisma generate
bun run build

cd ../frontend
bun install
bun run build
```

## Troubleshooting

| Problem                          | Solution                                                       |
|----------------------------------|----------------------------------------------------------------|
| `Browser not found`              | Run `bunx playwright install chromium`                         |
| `Session expired`                | Re-authenticate or re-import the session on the Session page   |
| `Port already in use`            | Change `PORT` in `backend/.env`                                |
| `Prisma migration error`         | Run `bunx prisma migrate deploy`                               |
| Posts fail with `selector error` | Facebook DOM structure changed — check selectors in `poster.ts`|
| `CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN` | Ensure all groups and post selected in schedule belong to active account |
