# AGENTS.md

Instructions for AI agents working on this project.

---

## Project Overview

**Facebook Group Auto-Poster** — A self-hosted automation system that schedules and posts content (text + images) to multiple Facebook Groups using browser automation. Built with Bun, TypeScript, Express, React, SQLite, Playwright, and node-cron.

---

## Repository Structure

```
fesnuk-automation/
├── AGENTS.md                  # This file
├── docs/                      # Project documentation (read before coding)
│   ├── ARCHITECTURE.md        # System design, tech stack, data flow
│   ├── DATABASE.md            # Prisma schema, all models & relations
│   ├── API.md                 # REST API endpoints reference
│   ├── SETUP.md               # Install & run instructions
│   ├── FEATURES.md            # v1 features & v2 roadmap
│   └── POSTING-FLOW.md        # Posting engine & anti-detection details
├── backend/                   # Express.js API + scheduler + Playwright
│   ├── prisma/schema.prisma   # Source of truth for DB schema
│   ├── src/
│   │   ├── config/            # Env, db client initialization
│   │   ├── controllers/       # Thin handlers — delegate to services
│   │   ├── services/
│   │   │   ├── scheduler.ts   # node-cron registration & teardown
│   │   │   ├── poster.ts      # Playwright posting logic per group
│   │   │   └── session.ts     # Session save/load/validate
│   │   ├── routes/            # Express router — one file per resource
│   │   ├── middlewares/       # Error handler, multer upload, validation
│   │   ├── utils/             # delay(), randomInt(), logger (Winston)
│   │   └── index.ts           # App bootstrap (Express + cron init)
│   ├── sessions/              # Saved browser session JSON files (gitignored)
│   ├── uploads/               # User-uploaded images (gitignored)
│   └── logs/                  # Winston log files (gitignored)
└── frontend/                  # React + Vite + Tailwind CSS dashboard
    └── src/
        ├── components/        # Reusable UI (Button, Table, Modal, etc.)
        ├── pages/             # One component per route
        ├── services/          # fetch() wrappers for each API resource
        ├── hooks/             # Custom React hooks (useGroups, usePosts, etc.)
        └── types/             # Shared TypeScript interfaces matching API shapes
```

---

## Tech Stack Quick Reference

| Concern         | Library / Tool                  |
|-----------------|---------------------------------|
| Backend runtime | Bun 1.x, TypeScript             |
| HTTP server     | Express.js                      |
| Database        | SQLite via Prisma ORM           |
| Browser engine  | Playwright + playwright-extra (stealth) |
| Scheduler       | node-cron                       |
| File uploads    | Multer                          |
| Logging         | Winston                         |
| Frontend build  | Vite                            |
| UI framework    | React 18                        |
| Styling         | Tailwind CSS                    |

---

## Coding Conventions

### General
- TypeScript strict mode (`"strict": true`) in both backend and frontend
- No `any` — use proper types or `unknown` with type guards
- Prefer `async/await` over `.then()` chains
- All async functions must handle errors (try/catch or Result types)

### Backend
- **Controllers** are thin: validate input, call a service, return response
- **Services** contain all business logic
- **Utils** are pure functions with no side effects
- API responses always use the envelope format:
  ```typescript
  res.json({ success: true, data: result });
  res.status(400).json({ success: false, error: "message", code: "ERROR_CODE" });
  ```
- Use Prisma client from `src/config/db.ts` — never instantiate `PrismaClient` elsewhere
- Cron jobs are registered once at startup in `scheduler.ts` — never ad-hoc

### Frontend
- One file per page component in `src/pages/`
- API calls only in `src/services/` — never fetch inside components directly
- Use `src/hooks/` for data fetching logic (wraps service calls)
- Tailwind only — no inline styles, no CSS modules

### File Naming
- `camelCase.ts` for all TypeScript files
- `PascalCase.tsx` for React components
- Route files: `groups.ts`, `posts.ts`, `schedules.ts`, `logs.ts`, `accounts.ts`

---

## Database Rules

- **Prisma is the source of truth.** Never modify `dev.db` directly.
- After any schema change: `bunx prisma migrate dev --name <description>`
- After pulling schema changes: `bunx prisma migrate deploy` + `bunx prisma generate`
- `imagePaths` in `Post` is stored as a JSON string — parse/stringify in the service layer
- Never delete PostLog records — they are the audit trail

---

## Commit Convention

**Semantic commits, header only. No body. No `Co-authored-by` or any trailer.**

Format:
```
<type>(<scope>): <short description>
```

Types:
| Type       | When to use                                        |
|------------|----------------------------------------------------|
| `feat`     | New feature or capability                          |
| `fix`      | Bug fix                                            |
| `refactor` | Code change that is not a feature or fix           |
| `docs`     | Documentation only                                 |
| `chore`    | Build, config, dependencies, tooling               |
| `test`     | Adding or fixing tests                             |
| `style`    | Formatting only (no logic change)                  |

Examples:
```
feat(scheduler): add random delay between group postings
fix(poster): handle expired session before posting run
chore(backend): init bun project with typescript
docs: add ARCHITECTURE and DATABASE docs
```

Rules:
- No message body
- No `Co-authored-by:` or any `Signed-off-by:` trailer
- Use present tense ("add" not "added")
- Keep header under 72 characters
- Commit at logical checkpoints, not per file

---

## Key Implementation Notes

1. **Session files** live in `backend/sessions/` and are `.gitignore`'d. Each file is named `<account-id>.json` and stores Playwright's `BrowserContext.storageState()` output.

2. **Posting uses one context per group** — create a new `browser.newContext()` for each group, inject the session, post, then close it. This prevents session state leaking between groups.

3. **Delay implementation** — use a `delay(ms: number)` util that wraps `setTimeout` in a Promise. The random delay between groups is computed as:
   ```typescript
   const ms = randomInt(schedule.delayMinSec, schedule.delayMaxSec) * 1000;
   await delay(ms);
   ```

4. **Never run two postings in parallel for the same account** — the scheduler must check `schedule.status === 'RUNNING'` before starting a new run.

5. **Stealth plugin** is applied once at browser launch, not per context.

6. **Image uploads** — Multer saves files to `backend/uploads/<uuid>.<ext>`. `imagePaths` in DB stores paths relative to `backend/` (e.g. `uploads/abc.jpg`). Playwright uses absolute paths when calling `setInputFiles`.

---

## Running Locally

```bash
# Backend (port 3001)
cd backend && bun run dev

# Frontend (port 5173)
cd frontend && bun run dev

# Prisma Studio (optional, port 5555)
cd backend && bunx prisma studio
```

See `docs/SETUP.md` for full setup instructions including session initialization.
