# Architecture

## Overview

Facebook Group Auto-Poster is a self-hosted automation system for scheduling and posting content to multiple Facebook Groups using anti-detection browser automation (Playwright) with a web-based React management dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│                    React Dashboard (Vite)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Sticky Topbar: Account Switcher │ Proxy Badge │ Auth Status│ │
│  └───────────────────────────────────────────────────────────┘  │
│       Groups │ Posts │ Schedules │ Logs │ Accounts / Session    │
│            (All views strictly scoped to active account)        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP REST API (JWT Bearer Auth)
┌───────────────────────────▼─────────────────────────────────────┐
│                    Express.js Backend                           │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  REST API   │  │  Scheduler   │  │   Session Manager     │  │
│  │  /api/v1/*  │  │  node-cron   │  │  Playwright cookies   │  │
│  │ (Auth Check)│  │ (Per Account)│  │ (Export/Import/Proxy) │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                │                      │               │
│  ┌──────▼──────────────────▼──────┐  ┌──────────▼────────────┐  │
│  │         Prisma ORM             │  │   Posting Engine      │  │
│  │      SQLite Database           │  │ Playwright + Stealth  │  │
│  │  (Multi-Account Data Isolated) │  │ (WebGL/WebRTC Spoof)  │  │
│  └────────────────────────────────┘  └───────────┬───────────┘  │
└──────────────────────────────────────────────────┼─────────────┘
                                                   │ Browser Automation (via Proxy if set)
                                        ┌──────────▼──────────┐
                                        │     Facebook.com     │
                                        │   (Group Posting)    │
                                        └─────────────────────┘
```

## Tech Stack

| Layer       | Technology                              | Purpose                                    |
|-------------|-----------------------------------------|--------------------------------------------|
| Runtime     | Bun 1.x                                 | Fast JavaScript runtime & package manager  |
| Language    | TypeScript                              | Strict type safety across backend & frontend|
| Backend     | Express.js                              | REST API server                            |
| Frontend    | React 18 + Vite                         | Web dashboard SPA                          |
| Styling     | Tailwind CSS                            | Responsive modern light UI                 |
| Database    | SQLite                                  | Local embedded relational database         |
| ORM         | Prisma                                  | Type-safe queries, migrations & schema     |
| Browser     | Playwright + playwright-extra           | Anti-detection browser automation          |
| Stealth     | puppeteer-extra-plugin-stealth (ported) | Bot signature mitigation & canvas spoofing |
| Scheduler   | node-cron                               | Cron-based schedule runner                 |
| Security    | JWT + bcryptjs                          | Master password dashboard protection       |
| File Upload | Multer                                  | Post image attachments                     |
| Logging     | Winston                                 | Structured logs with DOM snapshot & png dump|

## Folder Structure

```
facebook-automation/
├── AGENTS.md                  # AI agent guidelines & conventions
├── README.md                  # Project overview & deployment guide
├── docs/                      # Technical documentation
│   ├── ARCHITECTURE.md        # System design & architecture (this file)
│   ├── DATABASE.md            # Prisma models & relation rules
│   ├── API.md                 # REST API endpoints reference
│   ├── SETUP.md               # Local & VPS setup instructions
│   ├── FEATURES.md            # Feature tracker & roadmap
│   ├── POSTING-FLOW.md        # Detailed browser posting & anti-detection flow
│   └── MOBILE-PROXY-SETUP.md  # 4G/LTE mobile proxy rotation guide
│
├── backend/                   # Express.js API server
│   ├── prisma/
│   │   ├── schema.prisma      # Source of truth for database schema
│   │   └── migrations/        # Prisma schema migrations
│   ├── src/
│   │   ├── config/            # Env configuration & Prisma DB client singleton
│   │   ├── controllers/       # HTTP controllers with account validation
│   │   ├── services/
│   │   │   ├── scheduler.ts   # node-cron lifecycle & posting orchestrator
│   │   │   ├── poster.ts      # Playwright posting engine & stealth logic
│   │   │   ├── session.ts     # Cookie/storageState persistence & validation
│   │   │   └── groupSync.ts   # Automated joined group scraping & upsert
│   │   ├── routes/            # Express routers (/accounts, /groups, etc.)
│   │   ├── middlewares/       # Auth (JWT), rate limiting, file uploads, errors
│   │   ├── utils/             # delay, randomInt, logger, password auth
│   │   └── index.ts           # App bootstrap (Express server + cron runner)
│   ├── sessions/              # Saved Playwright storageState JSON files
│   ├── uploads/               # Post image attachments (UUID filenames)
│   ├── logs/                  # Winston log files and failure screenshots
│   ├── tests/                 # Integration tests (e.g. account-isolation.test.ts)
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                  # React + Vite dashboard
    ├── src/
    │   ├── components/        # Topbar, Sidebar, Modal, Badge, NoAccountsCard
    │   ├── context/           # AccountContext (active account state & switcher)
    │   ├── pages/
    │   │   ├── Dashboard.tsx  # Aggregate stats & quick run status
    │   │   ├── Groups.tsx     # Account-scoped target groups & auto-sync
    │   │   ├── Posts.tsx      # Post templates & image upload manager
    │   │   ├── Schedules.tsx  # Cron job schedules & delay configuration
    │   │   ├── Logs.tsx       # Audit trail, diagnostics, error inspect
    │   │   ├── Session.tsx    # Multi-account management & session import/export
    │   │   └── Login.tsx      # Master admin password login screen
    │   ├── services/          # API client fetch wrappers (injects token & accountId)
    │   ├── hooks/             # Custom React hooks (useAccount, useAsync)
    │   ├── types/             # Shared TypeScript API models
    │   └── App.tsx            # Main shell with layout & authentication routing
    ├── package.json
    └── vite.config.ts
```

## Multi-Account Architecture & Data Isolation

1. **Ownership Model**:
   - Every `Group`, `Post`, and `Schedule` belongs to an `Account` via foreign key `accountId` with `onDelete: Cascade`.
   - `PostLog` references `accountId` with `onDelete: SetNull` so audit trails are never lost.
   - Groups use a compound unique index `@@unique([accountId, fbGroupId])`. Two different Facebook accounts can both target group `12345` independently.

2. **Backend Guardrails**:
   - Resource listing endpoints (`/groups`, `/posts`, `/schedules`, `/logs`, `/logs/stats`) strictly require `?accountId=<id>`. If omitted, they return an empty set `[]` to prevent multi-tenant data leakage.
   - Creating a schedule verifies that the `postId` and all `groupIds` belong to the same `accountId` as the schedule. If any item belongs to another account, the API rejects the request with HTTP 400 `CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN`.

3. **Frontend Synchronization**:
   - `AccountContext` stores `selectedAccountId` in `localStorage`.
   - The sticky `Topbar` provides instant switching across accounts.
   - When no accounts exist, pages render `NoAccountsCard` prompting the user to create or import a session in the Session page.

## Data Flow

### Posting Execution Flow

```
node-cron tick
    │
    ▼
Scheduler Service
  - Find active schedules due for execution
  - Verify account is active and schedule is not already RUNNING
  - Load schedule's account proxy configuration (if set)
  - Load target post & assigned groups
    │
    ▼ (sequential iteration over groups with randomized delay)
Posting Engine (Playwright)
  - Launch browser context with stealth + WebGL/WebRTC spoofing + account proxy
  - Invalidate & assert session active via assertSessionActive()
  - Navigate to group URL
  - Enter content via direct input insertion (no accidental mentions)
  - Attach images via setInputFiles
  - Click Post & wait for DOM confirmation
  - On failure: save screenshot (.png) and DOM (.html) to logs/
    │
    ▼
PostLog (DB)
  - Record SUCCESS or FAILED with error message and accountId
  - Update schedule.lastRunAt & schedule.nextRunAt
```

### Session Onboarding Flow (Local vs VPS)

```
Option A: Local Headed Login
User clicks "Setup Session" ──► Backend launches headed Chrome ──► User logs in & passes 2FA ──► Session saved to backend/sessions/<id>.json

Option B: Headless VPS Session Import
User exports session JSON locally ──► In VPS Dashboard, clicks "Import Session" ──► Uploads JSON & optional proxy ──► Session saved to backend/sessions/<id>.json
```
