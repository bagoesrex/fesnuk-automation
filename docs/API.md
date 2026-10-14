# API Reference

Base URL: `http://localhost:3001/api/v1`

All responses follow the envelope format:

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

## Accounts

### `GET /accounts`

List all saved accounts.

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "name": "Main Account",
      "isActive": true,
      "sessionPath": "sessions/main.json",
      "createdAt": "2026-10-14T10:00:00.000Z"
    }
  ]
}
```

### `POST /accounts/session/start`

Opens a headed Playwright browser for the user to manually log in. The browser stays open until the user confirms login.

**Body**
```json
{ "name": "Main Account" }
```

**Response**
```json
{ "success": true, "data": { "message": "Browser opened. Complete login then call /session/confirm" } }
```

### `POST /accounts/session/confirm`

Saves the current browser session (cookies + localStorage) to disk and records the account in DB.

**Response**
```json
{ "success": true, "data": { "id": "clx...", "name": "Main Account" } }
```

### `DELETE /accounts/:id`

Remove an account and its session file.

---

## Groups

### `GET /groups`

List all groups.

### `POST /groups`

Add a new target group.

**Body**
```json
{
  "url": "https://www.facebook.com/groups/123456789",
  "name": "My Group"
}
```

> `fbGroupId` is extracted automatically from the URL.

### `PATCH /groups/:id`

Update group name or `isActive` status.

**Body** (all fields optional)
```json
{ "name": "Updated Name", "isActive": false }
```

### `DELETE /groups/:id`

Remove a group. Fails if group is assigned to an active schedule.

---

## Posts

### `GET /posts`

List all post drafts.

### `POST /posts`

Create a new post. Use `multipart/form-data` to include images.

**Form Fields**
| Field      | Type     | Required | Description                          |
|------------|----------|----------|--------------------------------------|
| `title`    | string   | yes      | Internal label                       |
| `content`  | string   | yes      | Post text/caption                    |
| `images`   | file[]   | no       | Up to 5 images (jpeg/png, max 10MB each) |

**Response**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "title": "Promo Oktober",
    "content": "Dapatkan diskon 50%!",
    "imagePaths": ["/uploads/abc.jpg"]
  }
}
```

### `PATCH /posts/:id`

Update post content or title. To replace images, send new `images` files.

### `DELETE /posts/:id`

Delete a post and its uploaded images from disk. Fails if post is assigned to an active schedule.

---

## Schedules

### `GET /schedules`

List all schedules with their associated groups and post info.

### `POST /schedules`

Create a new cron schedule.

**Body**
```json
{
  "name": "Morning Promo",
  "cronExpression": "0 9 * * 1-5",
  "accountId": "clx...",
  "postId": "clx...",
  "groupIds": ["clx...", "clx...", "clx..."],
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

### `PATCH /schedules/:id`

Update schedule. Changes take effect on the next cron tick.

### `POST /schedules/:id/toggle`

Enable or disable a schedule.

**Body**
```json
{ "isActive": false }
```

### `POST /schedules/:id/run`

Manually trigger a schedule immediately (ignores cron timing).

### `DELETE /schedules/:id`

Delete a schedule. Logs are preserved.

---

## Logs

### `GET /logs`

Get posting history with optional filters.

**Query Params**
| Param        | Type   | Description                              |
|--------------|--------|------------------------------------------|
| `scheduleId` | string | Filter by schedule                       |
| `groupId`    | string | Filter by group                          |
| `status`     | string | `SUCCESS`, `FAILED`, or `SKIPPED`        |
| `page`       | number | Pagination page (default: 1)             |
| `limit`      | number | Items per page (default: 50, max: 200)   |

**Response**
```json
{
  "success": true,
  "data": {
    "logs": [...],
    "total": 142,
    "page": 1,
    "totalPages": 3
  }
}
```

### `GET /logs/stats`

Aggregate stats for the dashboard overview.

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

| Code                    | HTTP Status | Description                              |
|-------------------------|-------------|------------------------------------------|
| `NOT_FOUND`             | 404         | Resource not found                       |
| `VALIDATION_ERROR`      | 422         | Invalid request body or params           |
| `SESSION_NOT_FOUND`     | 400         | No active session for the account        |
| `SCHEDULE_RUNNING`      | 409         | Cannot delete/edit a currently running schedule |
| `BROWSER_ERROR`         | 500         | Playwright browser failed to launch      |
| `INTERNAL_ERROR`        | 500         | Unexpected server error                  |
