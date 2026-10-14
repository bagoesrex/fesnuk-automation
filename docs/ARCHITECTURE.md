# Architecture

## Overview

Facebook Group Auto-Poster is a self-hosted automation system for scheduling and posting content to multiple Facebook Groups using browser automation (Playwright) with a web-based management dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│                    React Dashboard (Vite)                       │
│         Groups │ Posts │ Schedules │ Logs │ Session Setup       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP REST API
┌───────────────────────────▼─────────────────────────────────────┐
│                    Express.js Backend                           │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  REST API   │  │  Scheduler   │  │   Session Manager     │  │
│  │  /api/v1/*  │  │  node-cron   │  │  Playwright cookies   │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                │                      │               │
│  ┌──────▼──────────────────▼──────┐  ┌──────────▼────────────┐  │
│  │         Prisma ORM             │  │   Posting Engine      │  │
│  │         SQLite DB              │  │   Playwright + Stealth│  │
│  └────────────────────────────────┘  └───────────┬───────────┘  │
└──────────────────────────────────────────────────┼─────────────┘
                                                   │ Browser Automation
                                        ┌──────────▼──────────┐
                                        │     Facebook.com     │
                                        │   (Group Posting)    │
                                        └─────────────────────┘
```

## Tech Stack

| Layer       | Technology                              | Purpose                                    |
|-------------|-----------------------------------------|--------------------------------------------|
| Runtime     | Node.js 20+                             | JavaScript runtime                         |
| Language    | TypeScript                              | Type safety across backend & frontend      |
| Backend     | Express.js                              | REST API server                            |
| Frontend    | React + Vite                            | Web dashboard SPA                          |
| Styling     | Tailwind CSS                            | Utility-first CSS framework                |
| Database    | SQLite                                  | Local embedded database                    |
| ORM         | Prisma                                  | Type-safe database access & migrations     |
| Browser     | Playwright + playwright-extra           | Browser automation                         |
| Stealth     | puppeteer-extra-plugin-stealth (ported) | Anti-bot-detection measures                |
| Scheduler   | node-cron                               | Cron-based job scheduling                  |
| File Upload | Multer                                  | Handling image uploads                     |
| Logging     | Winston                                 | Structured application logging             |

## Folder Structure

```
facebook-automation/
├── AGENTS.md                  # AI agent instructions
├── docs/                      # Project documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SETUP.md
│   ├── FEATURES.md
│   └── POSTING-FLOW.md
│
├── backend/                   # Express.js API server
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Auto-generated migrations
│   ├── src/
│   │   ├── config/            # App configuration (env, db)
│   │   ├── controllers/       # Route handler functions
│   │   ├── services/
│   │   │   ├── scheduler.ts   # node-cron job management
│   │   │   ├── poster.ts      # Playwright posting logic
│   │   │   └── session.ts     # Cookie/session persistence
│   │   ├── models/            # Prisma client wrappers
│   │   ├── routes/            # Express router definitions
│   │   ├── middlewares/       # Auth, error, upload handlers
│   │   ├── utils/             # delay, random, logger helpers
│   │   └── index.ts           # App entry point
│   ├── sessions/              # Saved browser session files
│   ├── uploads/               # Uploaded post images
│   ├── logs/                  # Application log files
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                  # React + Vite dashboard
    ├── src/
    │   ├── components/        # Reusable UI components
    │   ├── pages/
    │   │   ├── Dashboard.tsx  # Overview & stats
    │   │   ├── Groups.tsx     # Manage target groups
    │   │   ├── Posts.tsx      # Create/manage post content
    │   │   ├── Schedules.tsx  # Cron schedule management
    │   │   └── Logs.tsx       # Posting history & logs
    │   ├── services/          # API client (fetch wrappers)
    │   ├── hooks/             # Custom React hooks
    │   ├── types/             # Shared TypeScript types
    │   └── App.tsx
    ├── package.json
    └── vite.config.ts
```

## Data Flow

### Posting Execution Flow

```
node-cron trigger
    │
    ▼
Scheduler Service
  - Load schedule from DB
  - Resolve groups list
  - Resolve post content + images
    │
    ▼ (for each group, with random delay)
Posting Engine (Playwright)
  - Load saved session/cookies
  - Navigate to group URL
  - Fill post content
  - Attach images (if any)
  - Submit post
  - Capture result
    │
    ▼
PostLog (DB)
  - status: SUCCESS | FAILED
  - error message if failed
  - timestamp
```

### Session Setup Flow

```
User clicks "Setup Session"
    │
    ▼
Backend opens Playwright (headed mode)
  - Opens facebook.com/login
  - User manually logs in
  - 2FA handled by user
    │
    ▼
Backend detects successful login
  - Saves browser cookies + storage to sessions/<name>.json
  - Marks Account as active in DB
    │
    ▼
Future posting loads saved session
  - No re-login needed until session expires
```
