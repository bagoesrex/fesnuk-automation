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
   ├─ a. Load Session & Early Guard
   │     └─ Read cookies from sessions/<account>.json into new Playwright context
   │     └─ If session file missing or unparseable → log SKIPPED, abort schedule
   │
   ├─ b. Navigate & Validate Group
   │     └─ Go to group URL (e.g. facebook.com/groups/123456789)
   │     └─ Validate authentication state (abort schedule if redirected to login / guest mode)
   │     └─ Check membership status (fails fast if "Join Group" is visible)
   │     └─ Detect group mode (fails fast if discussion disabled / "Buy and Sell" only)
   │
   ├─ c. Human-Like Composer Activation
   │     └─ Random scroll down (200–600px) and pause (1.5s–2.5s)
   │     └─ Scroll offset -120px to clear Facebook sticky header
   │     └─ Click "Tulis sesuatu..." / "Write something..." with { force: true }
   │     └─ Wait specifically for composer modal (filtering out hidden notification dialogs)
   │
   ├─ d. Fill Content (Direct Insertion)
   │     └─ Insert text directly via keyboard.insertText() to avoid auto-triggering member mention tags on newlines
   │     └─ Fallback verification: document.execCommand('insertText') if editor remains empty
   │     └─ Dismiss lingering mention dropdowns by focusing dialog header
   │
   ├─ e. Attach Images (if any)
   │     └─ Click photo/video button
   │     └─ Set input files via absolute paths
   │     └─ Wait for progress spinners to detach (up to 60s)
   │
   ├─ f. Submit Post
   │     └─ Wait for submit button to be enabled (aria-disabled !== 'true', up to 45s)
   │     └─ Click "Posting" / "Post" button with pointer force simulation
   │     └─ Wait for modal to detach (post published)
   │
   ├─ g. Cookie Auto-Save & Result Logging
   │     └─ Auto-save rotated storageState back to sessions/<account>.json
   │     └─ Write PostLog { status: SUCCESS }
   │     └─ On error: capture full DOM snapshot (.html) and screenshot (.png) to logs/
   │
   ├─ h. Close Browser Context
   │     └─ Dispose of Playwright context
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

## Session Expiry & Account Protection

During each group execution, the engine validates the session via `assertSessionActive(page)`:
1. Checks for redirects to `/login` or `/checkpoint`.
2. Checks inline Facebook metadata for unauthenticated guest mode (`USER_ID: 0`).
3. Detects login wall modals (*"See more on Facebook"*).
4. If expired:
   - Sets schedule status to `ERROR` and aborts remaining groups immediately to prevent wasting time in delay loops.
   - Automatically marks the Account as `isActive: false` to alert the user on the dashboard.

## Error Diagnostics & Snapshots

Whenever a post fails (selector timeout, button disabled, etc.), the engine captures:
1. **DOM Snapshot (`logs/dom-error-<timestamp>-<group>.html`)**: Full page HTML at the exact moment of failure.
2. **Screenshot (`logs/screenshot-error-<timestamp>-<group>.png`)**: Full visual state.
3. Appends the DOM file path directly into the error log message for fast debugging.
