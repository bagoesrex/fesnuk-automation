# Posting Flow & Anti-Detection

## End-to-End Posting Flow

When a cron schedule fires, the following steps execute sequentially:

```
1. Scheduler (node-cron)
   └─ Receives trigger at scheduled time
   └─ Checks schedule.isActive === true
   └─ Sets schedule.status = RUNNING
   └─ Loads: post content, image paths, ordered group list, account session

2. For each group in the ordered list:
   │
   ├─ a. Load Session
   │     └─ Read cookies + localStorage from sessions/<account>.json
   │     └─ Inject into new Playwright browser context
   │     └─ If session invalid → log SKIPPED, continue to next group
   │
   ├─ b. Navigate to Group
   │     └─ Go to group URL (e.g. facebook.com/groups/123456789)
   │     └─ Wait for post composer to appear
   │     └─ If group not found or access denied → log FAILED with error
   │
   ├─ c. Human-Like Interaction
   │     └─ Random scroll (200–600px)
   │     └─ Random pause (500ms–1500ms)
   │     └─ Click post composer
   │     └─ Random pause (300ms–800ms)
   │
   ├─ d. Fill Content
   │     └─ Type post text character by character
   │        (random per-character delay: 30ms–120ms)
   │
   ├─ e. Attach Images (if any)
   │     └─ Click photo/video button
   │     └─ Use Playwright file chooser to upload images
   │     └─ Wait for upload progress to complete
   │
   ├─ f. Submit Post
   │     └─ Click "Post" button
   │     └─ Wait for success confirmation (post appears in feed)
   │     └─ Capture result
   │
   ├─ g. Log Result
   │     └─ Write PostLog { status: SUCCESS | FAILED, error?, postedAt }
   │
   ├─ h. Close Browser Context
   │     └─ Dispose of Playwright context (not the browser itself)
   │
   └─ i. Wait Random Delay before next group
         └─ Math.random() * (delayMax - delayMin) + delayMin seconds

3. Scheduler Cleanup
   └─ Sets schedule.status = IDLE
   └─ Updates schedule.lastRunAt = now()
   └─ Calculates and stores schedule.nextRunAt
```

## Anti-Detection Measures

Facebook actively detects automation. The following measures reduce detection risk:

### 1. Stealth Browser Profile

Uses `playwright-extra` with stealth plugins to:
- Mask `navigator.webdriver` flag
- Spoof browser fingerprint (canvas, WebGL, fonts)
- Mimic a real Chrome user agent

```typescript
// shortcut: basic stealth only, add more plugins if detection increases
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
chromium.use(StealthPlugin());
```

### 2. Session Reuse (No Login Automation)

- User logs in manually — avoids the login flow entirely
- Saved cookies are reused for all subsequent postings
- Facebook's security systems see a normal logged-in session, not a bot login

### 3. Human-Like Timing

| Action                  | Delay Strategy                        |
|-------------------------|---------------------------------------|
| Between group postings  | Random: `delayMin`–`delayMax` seconds (configurable, default 5–15 min) |
| Before clicking composer| Random: 500ms–1500ms                  |
| Typing each character   | Random: 30ms–120ms per character      |
| After clicking a button | Random: 300ms–800ms                   |
| Page load wait          | Wait for actual DOM elements, not fixed timeouts |

### 4. Per-Group Browser Contexts

Each group posting uses a **new browser context** (separate cookies jar, viewport, etc.) but shares the same browser process. This mimics opening a fresh tab rather than the same session posting repeatedly.

### 5. Rate Limiting Recommendations

| Metric                          | Recommended Limit     |
|---------------------------------|-----------------------|
| Posts per account per day       | ≤ 20                  |
| Posts to same group per day     | ≤ 2                   |
| Concurrent posting schedules    | 1 (serialize, not parallel) |
| Minimum delay between groups    | 5 minutes             |

> These are guidelines. Risk tolerance varies by account age, group membership history, and Facebook's current enforcement policies.

## Error Handling & Retry

```
Attempt 1 → FAILED
  └─ Wait 30 seconds
Attempt 2 → FAILED
  └─ Wait 60 seconds
Attempt 3 → FAILED
  └─ Log as FAILED, move to next group
```

### Retried Errors (transient)
- Navigation timeout
- Element not found (composer not loaded yet)
- Upload still in progress

### Non-Retried Errors (permanent)
- Group not found / access denied
- Account checkpoint / locked
- Invalid session (cookie expired)

## Session Expiry Detection

Before each posting run, the engine checks if the session is still valid by:
1. Loading the session into a temporary context
2. Navigating to `facebook.com`
3. Checking if redirected to `/login` → session expired
4. If expired: log all groups as SKIPPED, send alert, set schedule to ERROR status

The user must then redo the session setup flow.
