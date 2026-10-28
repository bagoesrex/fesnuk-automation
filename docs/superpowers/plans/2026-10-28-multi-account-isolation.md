# Multi-Account Full Data Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete account-level data isolation (multi-tenancy) across Facebook Groups, Posts, Schedules, Logs, and Dashboard, controlled by a global topbar account switcher in the frontend.

**Architecture:** Database schema associates `Group` and `Post` with `Account` using `accountId` and compound uniqueness `[accountId, fbGroupId]`. Backend controllers validate strict single-account ownership on schedules (`CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN`). Frontend introduces a reactive `AccountContext` and sticky topbar switcher that transparently scopes all data fetching to the active account.

**Tech Stack:** Bun, TypeScript, SQLite, Prisma ORM, Express.js, Playwright, React 18, Vite, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-10-28-multi-account-isolation-design.md`

## Global Constraints
- TypeScript strict mode (`"strict": true`) across backend and frontend with zero `any`.
- Prisma is the single source of truth for the database schema.
- Semantic commit header only (`<type>(<scope>): <short description>`), under 72 chars, no body, no trailers.
- Pure light-mode styling in frontend, maintaining mobile responsiveness without horizontal overflows.

## Review Focus
- Attempting to create a schedule with a `postId` or `groupId` belonging to another account must reject with 422/400 `CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN`.
- Group sync (`POST /groups/sync`) must upsert groups strictly scoped to the target `accountId` using `accountId_fbGroupId`.
- Deleting an account must cascade-delete all its isolated groups, posts, and schedules without leaving orphan records.
- Switching accounts in the topbar must instantly update state in `Dashboard`, `Groups`, `Posts`, `Schedules`, and `Logs` without stale cache bleeding.
- When zero accounts exist in the database, all pages must render a friendly onboarding state directing the user to `/session` instead of crashing or showing broken spinners.

---

### Task 1: Prisma Schema Update & Database Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Output: Generated Prisma Client

**Interfaces:**
- Produces: `Account.groups: Group[]`, `Account.posts: Post[]`, `Group.accountId: string`, `Post.accountId: string`, compound unique constraint `@@unique([accountId, fbGroupId])`.

- [ ] **Step 1: Update `backend/prisma/schema.prisma`**
  Add `accountId String` and `account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)` to `Group` and `Post`. Update `Group` uniqueness to `@@unique([accountId, fbGroupId])` and add indexes.

- [ ] **Step 2: Apply database migration and generate Prisma client**
  Run: `cd backend && bunx prisma db push && bunx prisma generate`
  Expected: Database schema updated and client generated successfully.

- [ ] **Step 3: Commit**
  ```bash
  git add backend/prisma/schema.prisma
  git commit -m "feat(db): add account relation and compound unique to groups and posts"
  ```

---

### Task 2: Backend API & Service Account Isolation

**Files:**
- Modify: `backend/src/controllers/groups.ts`
- Modify: `backend/src/services/groupSync.ts`
- Modify: `backend/src/controllers/posts.ts`
- Modify: `backend/src/controllers/schedules.ts`
- Modify: `backend/src/controllers/logs.ts`
- Test: `backend/tests/account-isolation.test.ts`

**Interfaces:**
- Consumes: Prisma models `Group`, `Post`, `Schedule`, `Account` with `accountId`.
- Produces:
  - `GET /api/v1/groups?accountId=:id`: returns groups for `:id`.
  - `POST /api/v1/groups`: requires `accountId`.
  - `POST /api/v1/groups/sync`: accepts `{ accountId }`, saves groups with `accountId`.
  - `GET /api/v1/posts?accountId=:id`: returns posts for `:id`.
  - `POST /api/v1/posts`: multipart form requiring `accountId`.
  - `POST /api/v1/schedules`: validates `post.accountId === accountId` and all `groupIds` belong to `accountId`.
  - `GET /api/v1/schedules?accountId=:id`: returns schedules for `:id`.
  - `GET /api/v1/logs?accountId=:id`: returns logs for `:id`.
  - `GET /api/v1/logs/stats?accountId=:id`: returns stats scoped to `:id`.

- [ ] **Step 1: Write integration test proving cross-account isolation & rejection**
  Create `backend/tests/account-isolation.test.ts` testing:
  - Account A creates Group A and Post A.
  - Account B creates Group B and Post B.
  - Listing groups/posts for Account A returns only Group A and Post A.
  - Creating a schedule for Account A with Group B or Post B fails with 422 `CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN`.
  - Group sync saves groups tied to the provided `accountId`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd backend && bun test tests/account-isolation.test.ts`
  Expected: FAIL (controllers don't support `accountId` filters and validation yet).

- [ ] **Step 3: Implement controller & service updates**
  - Update `groups.ts`: filter `listGroups` by `req.query.accountId`, require `accountId` in `createGroup`, update `groupSync.ts` to upsert with `where: { accountId_fbGroupId: { accountId, fbGroupId } }`.
  - Update `posts.ts`: filter `listPosts` by `req.query.accountId`, require `accountId` in `createPost`.
  - Update `schedules.ts`: filter `listSchedules` by `req.query.accountId`, add strict ownership validation in `createSchedule` and `updateSchedule`.
  - Update `logs.ts`: filter `listLogs` and `getStats` by `req.query.accountId`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd backend && bun test tests/account-isolation.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/ backend/tests/
  git commit -m "feat(api): enforce account isolation and validation across resources"
  ```

---

### Task 3: Frontend Types & API Client Services

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/groups.ts`
- Modify: `frontend/src/services/posts.ts`
- Modify: `frontend/src/services/schedules.ts`
- Modify: `frontend/src/services/logs.ts`

**Interfaces:**
- Consumes: Updated backend API endpoints accepting `accountId`.
- Produces:
  - `groupsService.list(accountId?: string): Promise<Group[]>`
  - `groupsService.create(data: { name: string; url: string; accountId: string }): Promise<Group>`
  - `postsService.list(accountId?: string): Promise<Post[]>`
  - `schedulesService.list(accountId?: string): Promise<Schedule[]>`
  - `logsService.list(params: { accountId?: string; ... }): Promise<LogResponse>`
  - `logsService.getStats(accountId?: string): Promise<Stats>`

- [ ] **Step 1: Update TypeScript interfaces in `frontend/src/types/index.ts`**
  Add `accountId: string` to `Group` and `Post`.

- [ ] **Step 2: Update frontend service methods**
  Add optional `accountId` parameter to query methods in `groups.ts`, `posts.ts`, `schedules.ts`, and `logs.ts`.

- [ ] **Step 3: Run frontend build to check type integrity**
  Run: `cd frontend && bun run build`
  Expected: PASS (or identify callers to update in Tasks 4 & 5).

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/types/ frontend/src/services/
  git commit -m "feat(frontend): update api services and types with accountId"
  ```

---

### Task 4: Global Account Context & Topbar Switcher

**Files:**
- Create: `frontend/src/context/AccountContext.tsx`
- Create: `frontend/src/components/Topbar.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `useAccount()` hook returning `{ accounts, selectedAccount, selectedAccountId, setSelectedAccountId, refreshAccounts, loading }`.
- Topbar: Sticky bar at top of layout with active account dropdown, status indicator, proxy badge, and "+ Add Account" shortcut.

- [ ] **Step 1: Create `frontend/src/context/AccountContext.tsx`**
  Load accounts via `accountsService.list()`, persist `selectedAccountId` in `localStorage['fesnuk_selected_account_id']`, validate active selection, and provide auto-selection fallback.

- [ ] **Step 2: Create `frontend/src/components/Topbar.tsx`**
  Build sticky horizontal topbar with clean dropdown menu for account switching, account status indicator, and quick link to `/session`.

- [ ] **Step 3: Integrate Topbar in `frontend/src/App.tsx`**
  Wrap router in `<AccountProvider>`, render `<Topbar />` above `<main>`, keeping mobile navigation drawer fully compatible.

- [ ] **Step 4: Verify in browser / build**
  Run: `cd frontend && bun run build`
  Expected: Build succeeds without TypeScript errors.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/context/ frontend/src/components/Topbar.tsx frontend/src/App.tsx
  git commit -m "feat(frontend): add global account context and topbar switcher"
  ```

---

### Task 5: Page Scoping & Empty States

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/Groups.tsx`
- Modify: `frontend/src/pages/Posts.tsx`
- Modify: `frontend/src/pages/Schedules.tsx`
- Modify: `frontend/src/pages/Logs.tsx`
- Modify: `frontend/src/pages/Session.tsx`

**Interfaces:**
- All pages consume `const { selectedAccountId, selectedAccount } = useAccount()`.
- Data fetching queries pass `selectedAccountId`.
- Creating Groups, Posts, Schedules automatically assigns `selectedAccountId`.
- Empty state displayed when `!selectedAccountId` (no accounts connected yet).

- [ ] **Step 1: Update `Dashboard.tsx` & `Logs.tsx`**
  Pass `selectedAccountId` to `logsService.getStats(selectedAccountId)` and `logsService.list({ accountId: selectedAccountId })`.

- [ ] **Step 2: Update `Groups.tsx`**
  Pass `selectedAccountId` to `groupsService.list(selectedAccountId)`. Add manual group assigns `selectedAccountId`. "Sync from Facebook" automatically passes `selectedAccountId`.

- [ ] **Step 3: Update `Posts.tsx`**
  Pass `selectedAccountId` to `postsService.list(selectedAccountId)`. "Create Post" appends `accountId: selectedAccountId` to FormData.

- [ ] **Step 4: Update `Schedules.tsx`**
  Pass `selectedAccountId` to `schedulesService.list(selectedAccountId)`. "New Schedule" modal assigns `accountId: selectedAccountId` and displays only posts and groups belonging to `selectedAccountId`.

- [ ] **Step 5: Update `Session.tsx`**
  Call `refreshAccounts()` after account creation or deletion so the topbar and context immediately update.

- [ ] **Step 6: Run build and lint**
  Run: `cd frontend && bun run build && bun run lint`
  Expected: Clean build with zero lint errors.

- [ ] **Step 7: Commit**
  ```bash
  git add frontend/src/pages/
  git commit -m "feat(frontend): scope dashboard and resources to active account"
  ```

---

### Task 6: End-to-End Verification & Sanity Check

**Files:**
- Test: `test-e2e-multi-account.ts`

- [ ] **Step 1: Write E2E Playwright verification script**
  Test full end-to-end flow:
  1. Login / access dashboard.
  2. Switch between Account 1 and Account 2 in Topbar.
  3. Verify Group and Post tables reflect only Account 1's records when Account 1 is active.
  4. Verify Schedule creator prevents cross-account association.
  5. Verify mobile viewport responsiveness of the new Topbar.

- [ ] **Step 2: Run verification script**
  Run: `bun test-e2e-multi-account.ts`
  Expected: All checks pass.

- [ ] **Step 3: Remove test script & verify git working tree**
  Remove `test-e2e-multi-account.ts` and verify `git status`.

- [ ] **Step 4: Final commit / checkpoint**
