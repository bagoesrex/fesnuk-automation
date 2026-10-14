# Features & Roadmap

## v1 — Core (Current Scope)

### Session Management
- [x] Manual login flow via headed Playwright browser
- [x] Cookie + localStorage persistence to JSON file
- [x] Session status indicator in dashboard
- [x] Single account support

### Group Management
- [x] Add groups by pasting Facebook Group URL
- [x] Auto-extract group ID from URL
- [x] Enable / disable individual groups
- [x] Delete groups (blocked if in active schedule)

### Post Content
- [x] Create posts with text/caption
- [x] Upload up to 5 images per post (JPEG/PNG)
- [x] Internal title for easy identification
- [x] Enable / disable posts
- [x] Delete posts (blocked if in active schedule)

### Scheduling
- [x] Create cron-based schedules (standard 5-field cron syntax)
- [x] Assign one post + one account per schedule
- [x] Select and order target groups per schedule
- [x] Configurable random delay between group posts (min–max seconds)
- [x] Enable / disable schedules without deleting them
- [x] Manual "run now" trigger from dashboard
- [x] Schedule status tracking (IDLE / RUNNING / PAUSED / ERROR)

### Posting Engine
- [x] Playwright browser automation (headless)
- [x] Stealth mode to reduce bot detection
- [x] Human-like delays and mouse behavior
- [x] Post text content to Facebook Groups
- [x] Attach and upload images
- [x] Per-group error isolation (one failure doesn't stop others)
- [x] Automatic retry on transient errors (up to 2 retries)

### Logging & Monitoring
- [x] Per-attempt audit log (group, post, account, status, timestamp)
- [x] Error message capture on failure
- [x] Dashboard stats (total posts, success rate, active schedules)
- [x] Filterable log table (by schedule, group, status)
- [x] Pagination for log history

### Dashboard (React)
- [x] Overview page with key metrics
- [x] Groups management page
- [x] Posts management page with image preview
- [x] Schedules management page with cron helper
- [x] Logs page with filters
- [x] Session setup wizard

---

## v2 — Planned

### Multiple Accounts
- [ ] Add and manage multiple Facebook accounts
- [ ] Assign different accounts to different schedules
- [ ] Account rotation across schedules

### Content Templates
- [ ] Variable substitution in post content (`{{date}}`, `{{group_name}}`, etc.)
- [ ] Post variants (A/B content per group)
- [ ] Content library with tagging

### Advanced Scheduling
- [ ] One-time (non-recurring) scheduled posts
- [ ] Time zone support per schedule
- [ ] Blackout windows (don't post between certain hours)
- [ ] Daily posting limits per account

### Analytics
- [ ] Success rate trends over time (chart)
- [ ] Per-group engagement tracking
- [ ] Best posting time suggestions based on log history

### Reliability
- [ ] Session health check (auto-detect expired sessions)
- [ ] Email / webhook alerts on repeated failures
- [ ] Exponential backoff for retries

### Operations
- [ ] Docker Compose setup for easy deployment
- [ ] Export logs to CSV
- [ ] Backup / restore database
