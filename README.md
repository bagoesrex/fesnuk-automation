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

- **Multi-Account Data Isolation**: Complete workspace separation across Facebook accounts. Groups, posts, schedules, logs, and telemetry are strictly scoped per account. Supports multi-account targeting of the same Facebook group via compound unique keys (`[accountId, fbGroupId]`) and prevents cross-account association with strict backend validation.
- **Sticky Topbar Account Switcher**: Global account switcher in the topbar with live connection status, active proxy badges, and zero-account onboarding empty states across all pages.
- **Dashboard Security & Auth**: Master Admin Password with JWT session tokens and brute-force protection (lockout after 5 failed attempts).
- **Vercel + VPS Architecture Ready**: Deploy the frontend on Vercel and backend API on VPS with CORS protection.
- **Modern Light Theme & Mobile Responsive**: Clean, responsive layout optimized for mobile screens, tablets, and desktop workstations.
- **Session Export & Import (VPS Friendly)**: Authenticate Facebook sessions locally via headed browser, export the session JSON, and import directly into headless VPS instances without GUI / X11. Features automatic cookie rotation persistence and proactive logout detection (`assertSessionActive`).
- **Proxy Support per Account**: Assign Residential or 4G Mobile proxy (HTTP/SOCKS5) per account to safely run on VPS.
- **Hardware & Anti-Detection Spoofing**: WebGL GPU masking (spoofs SwiftShader to NVIDIA), WebRTC IP leak blocking, natural typing cadence, direct input text insertion (avoids accidental mention tags), and human-like cursor curves.
- **Automatic Group Sync**: One-click sync from `facebook.com/groups/joins/` with automated title cleaning and Buy & Sell mode detection.
- **Flexible Scheduling**: Cron-based batch execution with customizable random min/max delays between groups and randomized group ordering.
- **Live Media Management**: Multi-image attachments with real-time preview and lightbox viewer.
- **Audit Logging & Diagnostics**: Comprehensive post execution history with automated DOM snapshots (`.html`) and screenshots (`.png`) for any post failure.

---

## Quick Start (Local Development)

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

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | HTTP port the Express server listens on |
| `NODE_ENV` | `development` | App environment (`development` or `production`) |
| `DATABASE_URL` | `"file:./dev.db"` | SQLite database path for Prisma |
| `ADMIN_PASSWORD` | *(blank)* | Master admin password. When set, locks dashboard & API behind JWT auth |
| `JWT_SECRET` | *(random 32 char)* | Secret key used to sign and verify JWT authentication tokens |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origins (supports comma-separated list, e.g. `http://localhost:5173,https://my-app.vercel.app`) |
| `SESSIONS_DIR` | `./sessions` | Directory storing saved browser `storageState.json` files |
| `UPLOADS_DIR` | `./uploads` | Directory storing uploaded post images |
| `LOGS_DIR` | `./logs` | Directory for Winston audit and error log files |
| `PLAYWRIGHT_HEADLESS` | `false` | Run browser in headless mode (`true` on VPS/production, `false` for local debug) |
| `BROWSER_SLOW_MO` | `50` | Slow motion delay (ms) between browser actions |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `/api/v1` | Base API endpoint URL. In local dev keep `/api/v1` (uses Vite proxy). For production / Vercel, set to your VPS backend API URL (e.g. `https://api.yourdomain.com/api/v1`) |

---

## Deployment Guide: Frontend on Vercel + Backend on VPS

### Step 1: VPS Backend Configuration
1. Clone repository to your Linux VPS.
2. In `backend/.env`:
   ```env
   NODE_ENV=production
   PLAYWRIGHT_HEADLESS=true
   ADMIN_PASSWORD=your-super-strong-password-here
   JWT_SECRET=super-random-jwt-secret-string-at-least-32-chars
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```
3. Install Chromium dependencies:
   ```bash
   sudo apt-get update && sudo apt-get install -y ttf-mscorefonts-installer fonts-dejavu
   bunx playwright install-deps chromium
   ```
4. Setup PM2 / Systemd service and reverse proxy via Nginx with Let's Encrypt SSL (`https://api.yourdomain.com`).

### Step 2: Vercel Frontend Deployment
1. Import repository to Vercel (Root Directory: `frontend` or root with `frontend/vercel.json`).
2. Add Environment Variable:
   - `VITE_API_URL`: `https://api.yourdomain.com/api/v1`
3. Deploy. Accessing the dashboard will prompt for your Master Admin Password.
4. *Note: `vercel.json` includes `ignoreCommand` out-of-the-box, ensuring backend-only Git commits automatically skip redundant Vercel frontend rebuilds.*

---

## Headless VPS Session Workflow (No GUI Required)

Because Linux VPS servers have no GUI display, use the built-in **Session Export / Import** workflow:

1. **On your local computer**:
   - Open your local dashboard at `http://localhost:5173`.
   - Go to **Session** → choose **Browser Login (Local)**.
   - Click **Start Session Setup**, log into Facebook in the browser window, and click **Confirm Login**.
   - In the Saved Accounts table, click **Export** to download the `session-<account>.json` file.
2. **On your Vercel Dashboard (connected to VPS)**:
   - Go to **Session** → switch to **Import Session JSON (VPS)**.
   - Enter your Account Name and optional Proxy URL.
   - Upload the exported `.json` file (or paste its content).
   - Click **Import & Save Session**.
3. Your VPS backend is now fully authenticated and ready for scheduled headless posting without ever needing a display!

---

## Anti-Detection & Proxy Best Practices

1. **Always Use Residential / 4G Mobile Proxies**: VPS datacenter IP ranges (AWS, DigitalOcean, Hetzner, Linode) are heavily flagged by Facebook. Use a static residential proxy or turn an Android phone into your own 4G mobile proxy. See the full step-by-step guide: [docs/MOBILE-PROXY-SETUP.md](docs/MOBILE-PROXY-SETUP.md).
2. **Proxy Failure Isolation**: If a configured proxy is unreachable or drops, the system will fail safe and log an error rather than falling back to the VPS datacenter IP.
3. **Random Schedule Ordering & Delays**: In Schedules, use **Select All (Random)** and configure natural min/max posting delays (e.g. 180s to 360s).

---

## Testing

Run the automated test suite with the included E2E test runner:

```bash
bun run test:e2e:api   # 22 API integration tests (Auth, Accounts, Posts, Schedules, Logs)
bun run test:e2e:ui    # 31 UI end-to-end tests (Dashboard, Modals, Forms, Session tabs)
```

---

## License

MIT
