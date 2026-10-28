# API Reference

Base URL: `http://localhost:3001/api/v1`

All responses follow the standard envelope format:

```json
{
  "success": true,
  "data": { ... }
}
```

Errors:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

---

## Authentication

When `ADMIN_PASSWORD` is configured in `.env`, all endpoints (except `/auth/*` and `GET /logs`) require `Authorization: Bearer <token>`.

### `GET /auth/status`

Check whether master password protection is enabled and if current request is authenticated.

**Response**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "authenticated": true
  }
}
```

### `POST /auth/login`

Authenticate using the master admin password (enforces rate-limiting: max 5 failed attempts per IP before temporary lockout).

**Body**
```json
{ "password": "your-admin-password" }
```

**Response**
```json
{
  "success": true,
  "data": { "token": "jwt-token-string" }
}
```

---

## Accounts

### `GET /accounts`

List all configured accounts.

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "name": "Main Account",
      "proxyUrl": "http://user:pass@host:port",
      "isActive": true,
      "sessionPath": "sessions/clx....json",
      "createdAt": "2026-10-14T10:00:00.000Z",
      "updatedAt": "2026-10-14T10:00:00.000Z"
    }
  ]
}
```

### `POST /accounts/session/start`

Opens a headed Playwright browser for the user to manually log in.

**Body**
```json
{
  "name": "Main Account",
  "proxyUrl": "http://user:pass@host:port"
}
```

### `POST /accounts/session/confirm`

Saves the active headed browser session to disk and records the account in DB.

### `POST /accounts/session/import`

Import Playwright storageState JSON or cookie array directly (headless VPS friendly).

**Body**
```json
{
  "name": "VPS Account",
  "sessionData": "{ \"cookies\": [...] }",
  "proxyUrl": "http://user:pass@host:port"
}
```

### `GET /accounts/:id/session`

Export account session storageState JSON for backup or migration. Triggers file download.

### `PATCH /accounts/:id`

Update account name, proxyUrl, or active status.

**Body** (all fields optional)
```json
{
  "name": "Updated Name",
  "proxyUrl": "http://user:pass@new-proxy:port",
  "isActive": true
}
```

### `DELETE /accounts/:id`

Remove an account, its session JSON file, and cascade delete all its groups, posts, and schedules (logs are retained with `accountId: null`). Fails with 409 if any schedule for this account is currently `RUNNING`.

---

## Groups

All group resources are scoped per account.

### `GET /groups`

List groups scoped to an account.

**Query Params**
| Param       | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `accountId` | string | Recommended | Target account ID. If omitted, returns empty array `[]` to prevent cross-account leakage. |

### `POST /groups`

Add a new target group for an account.

**Body**
```json
{
  "url": "https://www.facebook.com/groups/123456789",
  "name": "My Group",
  "accountId": "clx..."
}
```

> `fbGroupId` is extracted automatically from the URL. Compound uniqueness `[accountId, fbGroupId]` prevents duplicates for the same account while allowing multiple accounts to join the same group.

### `POST /groups/sync`

Scrapes all joined groups for an account from `facebook.com/groups/joins/` and upserts them into the database.

**Body**
```json
{
  "accountId": "clx..."
}
```

### `PATCH /groups/:id`

Update group name or `isActive` status.

**Body** (all fields optional)
```json
{
  "name": "Updated Name",
  "isActive": false
}
```

### `DELETE /groups/:id`

Remove a group. Fails if group is currently assigned to an active schedule.

---

## Posts

Post templates are scoped per account.

### `GET /posts`

List post templates for an account.

**Query Params**
| Param       | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `accountId` | string | Recommended | Target account ID. Returns empty array `[]` if omitted. |

### `POST /posts`

Create a new post template. Use `multipart/form-data` to include images.

**Form Fields**
| Field       | Type     | Required | Description                               |
|-------------|----------|----------|-------------------------------------------|
| `title`     | string   | yes      | Internal label                            |
| `content`   | string   | yes      | Post text/caption                         |
| `accountId` | string   | yes      | Target account ID                         |
| `images`    | file[]   | no       | Up to 5 images (jpeg/png, max 10MB each)  |

**Response**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "title": "Promo Launch",
    "content": "Special launch deal!",
    "imagePaths": ["uploads/abc-uuid.jpg"],
    "accountId": "clx..."
  }
}
```

### `PATCH /posts/:id`

Update post content, title, or images.

### `DELETE /posts/:id`

Delete a post and its uploaded images from disk. Fails if post is assigned to an active schedule.

---

## Schedules

Schedules bind an account, a post, and an ordered list of groups.

### `GET /schedules`

List schedules for an account.

**Query Params**
| Param       | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `accountId` | string | Recommended | Target account ID. Returns empty array `[]` if omitted. |

### `POST /schedules`

Create a new cron schedule. All associated posts and groups must belong to the specified `accountId`.

**Body**
```json
{
  "name": "Morning Promo",
  "cronExpression": "0 9 * * 1-5",
  "accountId": "clx...",
  "postId": "clx...",
  "groupIds": ["clx_group_1", "clx_group_2"],
  "delayMinSec": 300,
  "delayMaxSec": 900
}
```

| Field            | Description                                      |
|------------------|--------------------------------------------------|
| `cronExpression` | Standard cron syntax (5-field)                   |
| `groupIds`       | Ordered array of group IDs (posting order)       |
| `delayMinSec`    | Minimum delay between group posts (seconds)      |
| `delayMaxSec`    | Maximum delay between group posts (seconds)      |

> Returns 400 `CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN` if `postId` or any `groupId` does not belong to `accountId`.

### `PATCH /schedules/:id`

Update schedule configuration (cron expression, delays, post, or groups). Cross-account validation is strictly enforced when changing posts or groups.

### `POST /schedules/:id/toggle`

Enable or disable a schedule.

**Body**
```json
{ "isActive": false }
```

### `POST /schedules/:id/run`

Manually trigger a schedule immediately (ignores cron timing). Account must not have another schedule currently `RUNNING`.

### `DELETE /schedules/:id`

Delete a schedule. Execution logs are preserved (`scheduleId` set to null).

---

## Logs

Execution history and audit trail.

### `GET /logs`

Get posting history with optional filters.

**Query Params**
| Param        | Type   | Description                                       |
|--------------|--------|---------------------------------------------------|
| `accountId`  | string | Filter by account (recommended; empty if omitted) |
| `scheduleId` | string | Filter by schedule                                |
| `groupId`    | string | Filter by group                                   |
| `status`     | string | `SUCCESS`, `FAILED`, or `SKIPPED`                 |
| `page`       | number | Pagination page (default: 1)                      |
| `limit`      | number | Items per page (default: 50, max: 200)            |

### `GET /logs/stats`

Aggregate stats for dashboard overview.

**Query Params**
| Param       | Type   | Description                                       |
|-------------|--------|---------------------------------------------------|
| `accountId` | string | Target account ID (returns zeroed stats if omitted)|

**Response**
```json
{
  "success": true,
  "data": {
    "totalPosts": 142,
    "successRate": 94.3,
    "activeSchedules": 3,
    "totalGroups": 18
  }
}
```

---

## Common Error Codes

| Code                                   | HTTP Status | Description                                                  |
|----------------------------------------|-------------|--------------------------------------------------------------|
| `NOT_FOUND`                            | 404         | Resource not found                                           |
| `VALIDATION_ERROR`                     | 422         | Invalid request body or missing required fields              |
| `CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN`  | 400         | Attempted to attach post/group belonging to another account  |
| `SESSION_NOT_FOUND`                    | 400         | No saved session for the account                             |
| `SCHEDULE_RUNNING`                     | 409         | Cannot delete/modify or run overlapping schedule             |
| `BROWSER_ERROR`                        | 500         | Playwright browser failed to launch or automate              |
| `INTERNAL_ERROR`                       | 500         | Unexpected server error                                      |
