# Features & Roadmap

## v1 — Core (Current Scope)

### Multi-Account & Session Management
- [x] Multi-account architecture with strict data isolation
- [x] Sticky Topbar account switcher with live status and proxy indicators
- [x] Compound unique group keys (`[accountId, fbGroupId]`) allowing multi-account targeting of the same group
- [x] Cross-account association validation preventing data leakage
- [x] Zero-account onboarding states (`NoAccountsCard`) across all pages
- [x] Manual login flow via headed Playwright browser (local)
- [x] Cookie persistence to JSON file with automatic token rotation saving
- [x] Headless session import/export (JSON) for VPS deployments
- [x] Per-account proxy assignment (HTTP / SOCKS5)
- [x] Session health guard with auto-abort on logout / checkpoint detection (`assertSessionActive`)

### Group Management
- [x] Add groups by pasting Facebook Group URL (scoped per account)
- [x] Auto-extract group ID from URL
- [x] One-click group sync from `facebook.com/groups/joins/`
- [x] Buy & Sell mode detection
- [x] Enable / disable individual groups
- [x] Delete groups (blocked if in active schedule)

### Post Content
- [x] Create posts with text/caption (scoped per account)
- [x] Direct text insertion preventing unintentional mention tags
- [x] Upload up to 5 images per post (JPEG/PNG)
- [x] Internal title for easy identification
- [x] Enable / disable posts
- [x] Delete posts (blocked if in active schedule)

### Scheduling
- [x] Create cron-based schedules (standard 5-field cron syntax)
- [x] Assign one post + one account per schedule with strict cross-account validation
- [x] Select and order target groups per schedule
- [x] Configurable random delay between group posts (min–max seconds)
- [x] Enable / disable schedules without deleting them
- [x] Manual "run now" trigger from dashboard
- [x] Schedule status tracking (IDLE / RUNNING / PAUSED / ERROR)

### Posting Engine & Anti-Detection
- [x] Playwright browser automation (headless / headed configurable)
- [x] Stealth mode to reduce bot detection
- [x] WebGL GPU masking (spoofs SwiftShader to NVIDIA) and WebRTC IP leak blocking
- [x] Human-like delays, natural typing cadence, and mouse behavior
- [x] Post text content to Facebook Groups
- [x] Attach and upload images
- [x] Per-group error isolation (one failure doesn't stop others)
- [x] Automatic retry on transient errors (up to 2 retries)

### Logging & Monitoring
- [x] Per-attempt audit log (group, post, account, status, timestamp)
- [x] Error message capture on failure
- [x] Full DOM snapshot (.html) and screenshot (.png) on error in `logs/`
- [x] Dashboard stats (total posts, success rate, active schedules) scoped per account
- [x] Filterable log table (by account, schedule, group, status)
- [x] Pagination for log history

### Dashboard & Security
- [x] Modern light theme with responsive mobile layout
- [x] Overview page with key metrics
- [x] Groups management page with sync modal
- [x] Posts management page with image preview & lightbox
- [x] Schedules management page with cron helper
- [x] Logs page with filters and diagnostic view
- [x] Session setup & import wizard
- [x] Master admin password with JWT authentication & brute-force protection
- [x] Vercel SPA routing rewrites and build-ignore optimization

---

## v2 — Planned

### Content Templates
- [ ] Variable substitution in post content (`{{date}}`, `{{group_name}}`, etc.)
- [ ] Post variants (A/B content per group)
- [ ] Content library with tagging

### Advanced Scheduling
- [ ] One-time (non-recurring) scheduled posts
- [ ] Time zone support per schedule
- [ ] Blackout windows (don't post between certain hours)
- [ ] Daily posting limits per account

### Analytics & Alerts
- [ ] Success rate trends over time (chart)
- [ ] Per-group engagement tracking
- [ ] Telegram / webhook alerts on repeated failures

### Operations
- [ ] Docker Compose setup for easy deployment
- [ ] Export logs to CSV
- [ ] Backup / restore database
