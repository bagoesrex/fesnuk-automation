# Multi-Account Full Data Isolation Design

**Date:** 2026-10-28  
**Branch:** `feat/multi-account-groups`  
**Status:** In Review  

---

## 1. Intent & Problem Statement

Currently, Facebook automation accounts are stored in the `Account` model, but `Group` and `Post` records exist as global entities without account ownership. When a user connects multiple Facebook accounts:
1. **Group Membership Mismatch:** Account A is a member of Groups [1, 2, 3], while Account B is a member of Groups [3, 4, 5]. If a schedule configured for Account B attempts to post to Group 1, Facebook will fail with permission or membership errors ("You are not a member of this group").
2. **Post Leakage:** Post templates and multimedia created for one identity or product line are visible and selectable across all accounts, risking accidental posting under the wrong Facebook persona.
3. **Group Sync Collisions:** The `Group` table enforces `@unique([fbGroupId])`. If both accounts join the same group, sync operations or manual additions fail or overwrite global state.

**Core Solution:** Enforce strict, full-stack multi-tenancy / account-level data isolation across the Database, Backend APIs, Automation Engine, and Frontend UI.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Full Data Isolation:** Every `Group` and `Post` belongs strictly to a single `Account`.
- **Per-Account Group Uniqueness:** A group is unique per account (`@@unique([accountId, fbGroupId])`), allowing multiple accounts to join and track the same Facebook group independently.
- **Strict Schedule Integrity:** A `Schedule` belonging to Account X can only associate with `Post` and `Group` entities owned by Account X.
- **Global Topbar Account Switcher (Option B):** A sticky horizontal topbar in the dashboard UI provides instant switching between active accounts, syncing the active account context across all pages (`Dashboard`, `Groups`, `Posts`, `Schedules`, `Logs`).
- **Account-Aware Background Execution:** The scheduler and Playwright poster already run per schedule/account, but with schema isolation guaranteed, poster execution will never attempt cross-account group postings.
- **Graceful Empty State:** When no accounts are registered yet, the UI provides clear guidance directing the user to connect an account in the `Session` page.

### Non-Goals
- Cross-account post sharing / content syndication (explicitly rejected by the user: posts must remain strictly isolated to the creating account).
- Multi-user RBAC or authentication credentials per Facebook account (master admin password still protects the overall dashboard).

### Anti-Goals
- Do not allow a schedule to reference a post or group belonging to another account under any circumstance.
- Do not expose "orphan" records in the UI when switching accounts.
- Do not break backward compatibility of Playwright stealth sessions in `backend/sessions/`.

---

## 3. Database Schema Changes (Prisma)

### Modified Models

```prisma
model Account {
  id          String   @id @default(cuid())
  name        String
  sessionPath String
  proxyUrl    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  groups      Group[]
  posts       Post[]
  schedules   Schedule[]
  postLogs    PostLog[]
}

model Group {
  id        String   @id @default(cuid())
  fbGroupId String
  name      String
  url       String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  accountId String
  account   Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  scheduleGroups ScheduleGroup[]
  postLogs       PostLog[]

  @@unique([accountId, fbGroupId])
  @@index([accountId])
}

model Post {
  id         String   @id @default(cuid())
  title      String
  content    String
  imagePaths String   @default("[]")
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  accountId String
  account   Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  schedules Schedule[]
  postLogs  PostLog[]

  @@index([accountId])
}

model Schedule {
  id             String         @id @default(cuid())
  name           String
  cronExpression String
  delayMinSec    Int            @default(300)
  delayMaxSec    Int            @default(900)
  isActive       Boolean        @default(true)
  status         String         @default("IDLE")
  lastRunAt      DateTime?
  nextRunAt      DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  accountId String
  account   Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  postId String
  post   Post    @relation(fields: [postId], references: [id], onDelete: Cascade)

  scheduleGroups ScheduleGroup[]
  postLogs       PostLog[]

  @@index([accountId])
}

model PostLog {
  id       String    @id @default(cuid())
  status   String
  error    String?
  postedAt DateTime  @default(now())

  scheduleId String?
  schedule   Schedule? @relation(fields: [scheduleId], references: [id], onDelete: SetNull)

  groupId String?
  group   Group?    @relation(fields: [groupId], references: [id], onDelete: SetNull)

  postId String?
  post   Post?     @relation(fields: [postId], references: [id], onDelete: SetNull)

  accountId String?
  account   Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)

  @@index([accountId])
}
```

### Migration Strategy
1. The user explicitly stated: *"Saya tidak masalah jika mengubah skema database nya dan pastikan buat branch baru terlebih dahulu"*.
2. If an existing `Account` exists in `dev.db`, existing groups and posts are migrated to belong to the first available account; if no account exists, a clean schema push via `bunx prisma migrate dev` or `bunx prisma db push` will initialize the clean schema.

---

## 4. Backend API Specifications

All resource routes require or filter by `accountId`.

### Groups (`/api/v1/groups`)
- `GET /api/v1/groups?accountId=:id`: List groups belonging to `:id`.
- `POST /api/v1/groups`: Body `{ accountId, name, url, fbGroupId }`. Validates account exists.
- `POST /api/v1/groups/sync`: Body `{ accountId }`. Scrapes `https://www.facebook.com/groups/joins/` using the specified account's Playwright session, and upserts groups tied to that `accountId`.
- `DELETE /api/v1/groups/:id`: Deletes group (cascades schedule-groups).

### Posts (`/api/v1/posts`)
- `GET /api/v1/posts?accountId=:id`: List posts belonging to `:id`.
- `POST /api/v1/posts`: Multipart form-data with `accountId`, `title`, `content`, `images`.
- `PUT /api/v1/posts/:id`: Updates post.
- `DELETE /api/v1/posts/:id`: Deletes post (and associated local images).

### Schedules (`/api/v1/schedules`)
- `GET /api/v1/schedules?accountId=:id`: List schedules for `:id`.
- `POST /api/v1/schedules`: Body `{ accountId, name, cronExpression, postId, groupIds, delayMinSec, delayMaxSec }`.
  - **Validation Rule:** Verifies that `post.accountId === accountId` and all `groupIds` have `group.accountId === accountId`. If not, returns 400 Bad Request (`CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN`).
- `PUT /api/v1/schedules/:id`: Updates schedule with identical ownership validation.

### Logs (`/api/v1/logs`)
- `GET /api/v1/logs?accountId=:id&page=1&limit=20&status=...`: Returns execution logs filtered by account.

### Accounts (`/api/v1/accounts`)
- `GET /api/v1/accounts`: Returns all accounts (id, name, proxyUrl, isActive, counts of groups/schedules).
- `POST /api/v1/accounts`: Create / register account.
- `DELETE /api/v1/accounts/:id`: Cascade delete account and its isolated groups, posts, schedules, and sessions.

---

## 5. Frontend Architecture & UI Design

### Global Account Context (`AccountContext.tsx`)
- Provides:
  - `accounts: Account[]`
  - `selectedAccount: Account | null`
  - `selectedAccountId: string | null`
  - `setSelectedAccountId: (id: string) => void`
  - `refreshAccounts: () => Promise<void>`
  - `loading: boolean`
- Stores `selectedAccountId` in `localStorage` under `fesnuk_selected_account_id`.
- If stored ID is invalid or not in accounts list, defaults to first active account.

### Global Topbar Header (Option B)
- Sticky bar at the top of the viewport in `App.tsx`:
  - Left / Center: Display active account name, badge status (Active / Inactive), and optional proxy indicator.
  - Dropdown selector to switch between connected Facebook accounts in 1 click.
  - Quick action: "+ Add Account" (links directly to `/session`).
  - Mobile responsive: Compact pill on small viewports.

### Page Behavior
- **Dashboard (`/`):** Telemetry cards (Total Posts, Active Groups, Active Schedules, Success Rate) calculate metrics scoped to `selectedAccountId`.
- **Groups (`/groups`):** Lists groups for `selectedAccountId`. The "Sync from Facebook" button automatically passes `selectedAccountId` and runs session sync for that account.
- **Posts (`/posts`):** Lists posts for `selectedAccountId`. "Create Post" modal attaches `accountId: selectedAccountId`.
- **Schedules (`/schedules`):** Lists schedules for `selectedAccountId`. "New Schedule" modal only displays post options and group checkboxes belonging to `selectedAccountId`.
- **Logs (`/logs`):** Displays audit logs filtered by `selectedAccountId`.
- **Session (`/session`):** Remains the central account & proxy manager where new accounts are added, imported, or deleted.
- **No-Account Empty State:** If no accounts exist in the database, displays an onboarding card: *"No Facebook accounts connected yet. Please add an account to begin."* with a button to `/session`.

---

## 6. Anti-Detection & Engine Integrity
- Playwright posting engine (`poster.ts`) operates strictly on the schedule's `accountId` and associated `account.sessionPath`.
- Each group in a schedule is posted using a fresh browser context isolated per group run with random delay interval (`delayMinSec` to `delayMaxSec`).
- Because all groups and posts within a schedule are verified to belong to the schedule's account, Facebook will never encounter session mismatches or "non-member" post rejections.

---

## 7. What is Left to the Builder
- Exact layout styling and CSS transitions for the Topbar dropdown menu.
- Query param structure for API client functions (`api.get('/groups', { params: { accountId } })`).
- Automated integration test verification proving cross-account isolation.
