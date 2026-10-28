# Database Schema

ORM: **Prisma** | Database: **SQLite**

## Models

### Account

Stores saved Facebook account sessions and connection configurations.

```prisma
model Account {
  id          String   @id @default(cuid())
  name        String                          // Display name (e.g. "Main Account")
  sessionPath String                          // Path to saved session JSON file
  proxyUrl    String?                         // Optional proxy (http://user:pass@host:port or socks5://)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  groups      Group[]
  posts       Post[]
  schedules   Schedule[]
  postLogs    PostLog[]
}
```

### Group

Target Facebook Groups scoped to an individual account.

```prisma
model Group {
  id        String   @id @default(cuid())
  fbGroupId String                           // Facebook Group ID (extracted from URL)
  name      String                           // Display name
  url       String                           // Full Facebook group URL
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
```

> Compound uniqueness `@@unique([accountId, fbGroupId])` allows multiple Facebook accounts to join and target the same group without conflict.

### Post

Content to be posted (text + optional images), scoped to an individual account.

```prisma
model Post {
  id         String   @id @default(cuid())
  title      String                          // Internal label (not posted)
  content    String                          // Post text/caption
  imagePaths String   @default("[]")       // JSON array of uploaded image paths
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  accountId  String
  account    Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  schedules  Schedule[]
  postLogs   PostLog[]

  @@index([accountId])
}
```

> `imagePaths` is stored as a JSON string array since SQLite has no native array type.

### Schedule

A cron-based schedule linking an Account, Post, and a set of Groups.

```prisma
model Schedule {
  id             String         @id @default(cuid())
  name           String                               // Display name
  cronExpression String                               // e.g. "0 9 * * *" (9am daily)
  delayMinSec    Int            @default(300)        // Min delay between groups (seconds)
  delayMaxSec    Int            @default(900)        // Max delay between groups (seconds)
  isActive       Boolean        @default(true)
  status         String         @default("IDLE")     // IDLE | RUNNING | PAUSED | ERROR
  lastRunAt      DateTime?
  nextRunAt      DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  accountId      String
  account        Account        @relation(fields: [accountId], references: [id], onDelete: Cascade)

  postId         String
  post           Post           @relation(fields: [postId], references: [id], onDelete: Cascade)

  scheduleGroups ScheduleGroup[]
  postLogs       PostLog[]

  @@index([accountId])
}
```

> `ScheduleStatus` values (`IDLE`, `RUNNING`, `PAUSED`, `ERROR`) are enforced at the service layer because SQLite does not support native enums.

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

Audit log for every individual group posting attempt. Retained even if associated entities are deleted (`onDelete: SetNull`).

```prisma
model PostLog {
  id         String    @id @default(cuid())
  status     String                         // SUCCESS | FAILED | SKIPPED
  error      String?                        // Error message if FAILED
  postedAt   DateTime  @default(now())

  scheduleId String?
  schedule   Schedule? @relation(fields: [scheduleId], references: [id], onDelete: SetNull)

  groupId    String?
  group      Group?    @relation(fields: [groupId], references: [id], onDelete: SetNull)

  postId     String?
  post       Post?     @relation(fields: [postId], references: [id], onDelete: SetNull)

  accountId  String?
  account    Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)
}
```

> `LogStatus` values (`SUCCESS`, `FAILED`, `SKIPPED`) are enforced at the service layer.

---

## Entity Relationship Diagram

```
                 Account
        ┌───────────┼───────────┐
    1:N │       1:N │       1:N │
        ▼           ▼           ▼
      Group       Post       Schedule
        │           │           │
        │           │       N:M │ (via ScheduleGroup)
        │           │           ▼
        │           └───────► Group
        │                       │
        └───────────┬───────────┘
                1:N │ (SetNull on delete)
                    ▼
                 PostLog
```

---

## Indexes & Constraints

| Table         | Index / Constraint              | Type       | Purpose                                        |
|---------------|---------------------------------|------------|------------------------------------------------|
| Group         | `[accountId, fbGroupId]`        | Compound Unique | Prevents duplicate groups per account, allows across accounts |
| Group         | `[accountId]`                   | Index      | Fast lookup of groups scoped to active account |
| Post          | `[accountId]`                   | Index      | Fast lookup of posts scoped to active account  |
| Schedule      | `[accountId]`                   | Index      | Fast lookup of schedules per account           |
| ScheduleGroup | `[scheduleId, groupId]`         | Compound Unique | Prevents duplicate group in single schedule    |
