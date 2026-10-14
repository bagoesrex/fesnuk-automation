# Database Schema

ORM: **Prisma** | Database: **SQLite**

## Models

### Account

Stores saved Facebook account sessions.

```prisma
model Account {
  id          String    @id @default(cuid())
  name        String                          // Display name (e.g. "Main Account")
  sessionPath String                          // Path to saved session JSON file
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  schedules   Schedule[]
  postLogs    PostLog[]
}
```

### Group

Target Facebook Groups to post into.

```prisma
model Group {
  id        String   @id @default(cuid())
  fbGroupId String   @unique                 // Facebook Group ID (extracted from URL)
  name      String                           // Display name
  url       String                           // Full Facebook group URL
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  scheduleGroups ScheduleGroup[]
  postLogs       PostLog[]
}
```

### Post

Content to be posted (text + optional images).

```prisma
model Post {
  id          String     @id @default(cuid())
  title       String                          // Internal label (not posted)
  content     String                          // Post text/caption
  imagePaths  String     @default("[]")       // JSON array of uploaded image paths
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  schedules   Schedule[]
  postLogs    PostLog[]
}
```

> `imagePaths` is stored as a JSON string array since SQLite has no native array type.

### Schedule

A cron-based schedule linking an Account, Post, and a set of Groups.

```prisma
model Schedule {
  id             String          @id @default(cuid())
  name           String                               // Display name
  cronExpression String                               // e.g. "0 9 * * *" (9am daily)
  delayMinSec    Int             @default(300)        // Min delay between groups (seconds)
  delayMaxSec    Int             @default(900)        // Max delay between groups (seconds)
  isActive       Boolean         @default(true)
  status         ScheduleStatus  @default(IDLE)
  lastRunAt      DateTime?
  nextRunAt      DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  accountId      String
  account        Account         @relation(fields: [accountId], references: [id])

  postId         String
  post           Post            @relation(fields: [postId], references: [id])

  scheduleGroups ScheduleGroup[]
  postLogs       PostLog[]
}

enum ScheduleStatus {
  IDLE       // Not currently running
  RUNNING    // Currently posting
  PAUSED     // Manually paused
  ERROR      // Last run encountered a fatal error
}
```

### ScheduleGroup

Many-to-many join table between Schedule and Group (with ordering).

```prisma
model ScheduleGroup {
  id         String   @id @default(cuid())
  order      Int      @default(0)           // Posting order within the schedule

  scheduleId String
  schedule   Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)

  groupId    String
  group      Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([scheduleId, groupId])
}
```

### PostLog

Audit log for every individual group posting attempt.

```prisma
model PostLog {
  id         String    @id @default(cuid())
  status     LogStatus
  error      String?                        // Error message if FAILED
  postedAt   DateTime  @default(now())

  scheduleId String
  schedule   Schedule  @relation(fields: [scheduleId], references: [id])

  groupId    String
  group      Group     @relation(fields: [groupId], references: [id])

  postId     String
  post       Post      @relation(fields: [postId], references: [id])

  accountId  String
  account    Account   @relation(fields: [accountId], references: [id])
}

enum LogStatus {
  SUCCESS
  FAILED
  SKIPPED   // Group inactive or unreachable
}
```

## Entity Relationship Diagram

```
Account ──────────────┐
  │                   │
  │ 1:N               │ 1:N
  ▼                   ▼
Schedule ─── N:M ─── Group
  │          (via      │
  │        ScheduleGroup)
  │ N:1               │
  ▼                   │
Post                  │
  │                   │
  └─────── 1:N ───────┘
              ▼
           PostLog
```

## Indexes

Prisma generates indexes for all `@id` and `@unique` fields. Additional query patterns to consider:

| Table       | Index On                        | Query Pattern                |
|-------------|---------------------------------|------------------------------|
| PostLog     | `(scheduleId, postedAt)`        | Fetch logs per schedule      |
| PostLog     | `(groupId, postedAt)`           | Fetch logs per group         |
| Schedule    | `(isActive, status)`            | Load active schedules on boot|
| Group       | `fbGroupId`                     | Dedup on group import        |
