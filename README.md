# Fesnuk Group Auto-Poster

A self-hosted automation system for scheduling and posting content (text + images) to multiple Facebook Groups using anti-detection browser automation.

---

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Backend**: Express.js + TypeScript + Prisma (SQLite)
- **Browser Automation**: Playwright + `playwright-extra` + `puppeteer-extra-plugin-stealth`
- **Scheduler**: `node-cron`
- **Frontend**: React 18 + Vite + Tailwind CSS + Phosphor Icons
- **End-to-End Testing**: `@e2e-dev/web` test runner

---

## Key Features

- **Single Sign-On Session**: Login once via headed browser, cookies and storage state are saved encrypted locally.
- **Proxy Support per Account**: Assign Residential or 4G Mobile proxy (HTTP/SOCKS5) per account to safely run on VPS.
- **Hardware & Anti-Detection Spoofing**: WebGL GPU masking (spoofs SwiftShader to NVIDIA), WebRTC IP leak blocking, natural typing cadence, and human-like cursor curves.
- **Automatic Group Sync**: One-click sync from `facebook.com/groups/joins/` with automated title cleaning.
- **Flexible Scheduling**: Cron-based batch execution with customizable random min/max delays between groups and randomized group ordering.
- **Live Media Management**: Multi-image attachments with real-time preview and lightbox viewer.
- **Audit Logging**: Comprehensive post execution history with status filtering and error tracking.

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Git

```bash
git clone https://github.com/bagoesrex/fesnuk-automation
cd fesnuk-automation
```

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
bun install
bunx playwright install chromium
bun run dev
# Backend running at http://localhost:3001 (auto-deploys database migrations on startup)
```

### 2. Frontend Setup (New Terminal)

```bash
cd frontend
cp .env.example .env
bun install
bun run dev
# Dashboard available at http://localhost:5173
```

Alternatively, from the repository root:

```bash
bun run dev:backend   # Start backend
bun run dev:frontend  # Start frontend
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable              | Default                 | Description                                                                      |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `PORT`                | `3001`                  | HTTP port the Express server listens on                                          |
| `NODE_ENV`            | `development`           | App environment (`development` or `production`)                                  |
| `DATABASE_URL`        | `"file:./dev.db"`       | SQLite database path for Prisma                                                  |
| `SESSIONS_DIR`        | `./sessions`            | Directory storing saved browser `storageState.json` files                        |
| `UPLOADS_DIR`         | `./uploads`             | Directory storing uploaded post images                                           |
| `LOGS_DIR`            | `./logs`                | Directory for Winston audit and error log files                                  |
| `PLAYWRIGHT_HEADLESS` | `false`                 | Run browser in headless mode (`true` on VPS/production, `false` for local debug) |
| `BROWSER_SLOW_MO`     | `50`                    | Slow motion delay (ms) between browser actions                                   |
| `CORS_ORIGIN`         | `http://localhost:5173` | Allowed frontend URL for CORS                                                    |

### Frontend (`frontend/.env`)

| Variable       | Default   | Description                                               |
| -------------- | --------- | --------------------------------------------------------- |
| `VITE_API_URL` | `/api/v1` | Base API endpoint URL (keep `/api/v1` for Vite dev proxy) |

---

## First-Time Setup Workflow

1. Open dashboard at `http://localhost:5173`.
2. Navigate to **Session** → fill in Account Name (and optional Residential/Mobile Proxy URL).
3. Click **Start Session Setup** to open the browser window and log in to Facebook manually.
4. Once you reach your Facebook home feed, click **Confirm Login**.
5. Navigate to **Groups** → click **Sync Groups** to automatically import your joined groups (or add them manually).
6. Navigate to **Posts** → create post text and optional images.
7. Navigate to **Schedules** → create a schedule, configure cron or pick groups (use **Select All (Random)** for randomized posting order).
8. Use **Run Now** (▶) to execute an on-demand batch, or toggle status to let the cron daemon handle execution automatically.

---

## VPS Deployment & Anti-Detection Notes

When hosting on a VPS:

1. **Always Use Residential / 4G Mobile Proxies**: VPS datacenter IP ranges are heavily flagged by Facebook. Use a static residential proxy or your own home Android 4G proxy (via Tailscale + Every Proxy).
2. **Headless Linux Dependencies**: Install required Linux fonts and libraries:
   ```bash
   sudo apt-get update && sudo apt-get install -y ttf-mscorefonts-installer fonts-dejavu
   bunx playwright install-deps chromium
   ```
3. **Headless Mode**: Set `PLAYWRIGHT_HEADLESS=true` in `backend/.env`.

---

## Testing

Run the automated test suite with the included E2E test runner:

```bash
bun run test:e2e:api   # 19 API integration tests
bun run test:e2e:ui    # 30 UI end-to-end tests
```

---
