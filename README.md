# Facebook Group Auto-Poster

Self-hosted automation system for scheduling and posting content (text + images) to multiple Facebook Groups using browser automation.

## Stack

- **Runtime** — Bun
- **Backend** — Express.js + TypeScript + Prisma (SQLite)
- **Browser** — Playwright + stealth plugin
- **Scheduler** — node-cron
- **Frontend** — React + Vite + Tailwind CSS

## Features

- Manual login once, session saved automatically
- Manage multiple target Facebook Groups
- Create posts with text and images (up to 5)
- Schedule posts with cron expressions
- Random delay between group postings (anti-detection)
- Full audit log with success/failure tracking
- Web dashboard to manage everything

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) and Git installed.

```bash
git clone <repo-url> facebook-automation
cd facebook-automation
```

**Backend:**

```bash
cd backend
cp .env.example .env
bun install
bunx prisma migrate dev --name init
mkdir -p sessions uploads logs
bun run dev
# API running at http://localhost:3001
```

**Frontend** (new terminal):

```bash
cd frontend
bun install
bun run dev
# Dashboard at http://localhost:5173
```

**Install Chromium** (first time only):

```bash
cd backend && bunx playwright install chromium
```

## First-Time Setup

1. Open `http://localhost:5173`
2. Go to **Session** → click **Start Session Setup**
3. Log in to Facebook in the browser that opens
4. Click **Confirm Login** in the dashboard
5. Go to **Groups** → add your target Facebook groups
6. Go to **Posts** → create your post content
7. Go to **Schedules** → create a cron schedule and pick groups
8. Monitor results in **Logs**

## Project Structure

```
facebook-automation/
├── backend/          # Express API + scheduler + Playwright
│   ├── prisma/       # Database schema & migrations
│   └── src/
│       ├── config/   # Env config, Prisma client
│       ├── controllers/
│       ├── services/ # scheduler.ts, poster.ts, session.ts
│       ├── routes/
│       ├── middlewares/
│       └── utils/
└── frontend/         # React dashboard
    └── src/
        ├── pages/    # Dashboard, Groups, Posts, Schedules, Logs, Session
        ├── services/ # API client wrappers
        ├── hooks/
        └── types/
```

See [`docs/`](docs/) for full documentation.
