# Light Mode & Mobile UI Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the frontend to a pure light-mode theme across all components (including LockScreen, AuthGate, and Modals) and achieve seamless mobile responsiveness across all viewports (320px–768px+) with zero horizontal overflow.

**Architecture:** 
1. Convert dark theme tokens in `LockScreen.tsx` and `AuthGate.tsx` to a clean, cohesive light palette matching the rest of the application.
2. Introduce a responsive layout shell in `App.tsx` / `Sidebar.tsx` with a sticky mobile topbar and slide-over navigation drawer for viewports under `768px` (`md:`), allowing `<main>` to utilize 100% of mobile width instead of being crushed by the fixed 256px desktop sidebar.
3. Replace rigid outer paddings (`p-8`) across all 6 pages with fluid responsive scales (`p-4 sm:p-6 lg:p-8`), wrap all data tables with horizontal scroll containers (`overflow-x-auto min-w-[...]`), and adapt form controls and modal dialogs for touch devices.

**Tech Stack:** React 19, Vite, Tailwind CSS 4, React Router 7, Phosphor Icons, Bun.

---

## Global Constraints

- **Theme Consistency:** Pure light mode throughout. No dark mode artifacts, dark background containers (`bg-zinc-950`, `bg-zinc-900`), or white text on dark cards, except for intentional translucent modal backdrops and the image lightbox overlay.
- **No Horizontal Page Overflow:** `document.documentElement.scrollWidth === document.documentElement.clientWidth` across all standard mobile viewports (375px iPhone SE, 390px iPhone 12/14, 412px Android).
- **Mobile Input Usability:** Form inputs must use `text-base sm:text-sm` to prevent iOS Safari auto-zoom on input focus.
- **Maintain Existing Routing & Tests:** Desktop sidebar and routing must remain fully functional and compatible with existing `@e2e-dev/web` test selectors.

## Review Focus

1. **Mobile Sidebar Collapse:** When viewport is `< 768px`, the desktop sidebar must be hidden (`hidden md:flex`) and accessible via mobile hamburger toggle, preventing main content from being restricted to a 119px column.
2. **LockScreen & AuthGate Light Styling:** The login screen and auth loading state must display on a crisp `bg-zinc-50` background with a clean `bg-white` card, clear text contrast, and light input fields.
3. **Table Horizontal Scrolling:** Tables in `Groups`, `Schedules`, `Logs`, and `Session` must scroll smoothly horizontally inside an `overflow-x-auto` wrapper without clipping buttons or forcing horizontal page scroll.
4. **Modal Viewport Fit:** Modals in `Modal.tsx` must fit within 92vh, have responsive inner padding (`px-4 py-4 sm:px-6 sm:py-5`), and allow inner scroll on small mobile screens.
5. **Image Grid & Action Wrap:** Multi-image uploads and action button rows in `Posts`, `Schedules`, and `Logs` must wrap cleanly on mobile without breaking grid dimensions or overflowing container bounds.

---

### Task 1: Convert LockScreen and AuthGate to Pure Light Theme

**Files:**
- Modify: `frontend/src/components/LockScreen.tsx`
- Modify: `frontend/src/components/AuthGate.tsx`

**Interfaces:**
- `LockScreen({ onSuccess }: { onSuccess: () => void })`
- `AuthGate({ children }: { children: ReactNode })`

- [ ] **Step 1: Update `AuthGate.tsx` loading screen to light mode**
  Replace `bg-zinc-950 text-zinc-400` with `bg-zinc-50 text-zinc-500` so authentication checking does not flash a dark screen.

- [ ] **Step 2: Update `LockScreen.tsx` container and card styles to light mode**
  - Change outer container from `bg-zinc-950 text-zinc-100` to `bg-zinc-50 text-zinc-900`.
  - Update ambient background glow to `bg-blue-500/5`.
  - Update Brand icon container to `bg-blue-50/70 border border-blue-100/80 shadow-xs`.
  - Update card container to `bg-white border border-zinc-200/80 shadow-xl shadow-zinc-200/50 rounded-2xl p-6 sm:p-8`.
  - Update input field to `bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-blue-500/20 focus:border-blue-600 text-base sm:text-sm`.
  - Update error container to `bg-rose-50 border border-rose-200 text-rose-700`.
  - Update helper footer text and code tags to zinc-500 and zinc-700.

- [ ] **Step 3: Verify build passes**
  Run: `bun --cwd frontend run build`
  Expected: Build succeeds with 0 errors.

---

### Task 2: Implement Responsive Mobile Navigation & Shell in `Sidebar.tsx` and `App.tsx`

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- `Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onCloseMobile?: () => void })` or compound mobile header + drawer support.

- [ ] **Step 1: Add Mobile Header and Drawer controls to `Sidebar.tsx`**
  - Add mobile top bar (visible on `< md`) with BrandLogo, "AutoPoster", live indicator pill, and mobile menu toggle button (`List` / `X` icon).
  - Hide desktop sidebar on small screens: `hidden md:flex md:w-64 md:shrink-0`.
  - Add mobile slide-over drawer with backdrop (`fixed inset-0 z-40 bg-zinc-950/40 md:hidden`) that renders full navigation links and logout button when opened.
  - Automatically close mobile drawer when any navigation link is clicked.

- [ ] **Step 2: Update `App.tsx` layout container**
  - Change `<div className="flex h-screen overflow-hidden bg-zinc-50">` to support column stacking on mobile: `flex flex-col md:flex-row h-screen overflow-hidden bg-zinc-50`.
  - Ensure `<main className="flex-1 min-w-0 h-full overflow-y-auto">` receives full screen width on mobile devices.

- [ ] **Step 3: Run Playwright viewport audit to verify mobile width allocation**
  Run audit script across 375px and 390px viewports.
  Expected: `mainWidth` expands to 375px/390px (not 119px), desktop sidebar remains intact on >= 768px.

---

### Task 3: Make Core Pages (`Dashboard`, `Groups`, `Posts`) Responsively Scaled

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/Groups.tsx`
- Modify: `frontend/src/pages/Posts.tsx`
- Modify: `frontend/src/components/Modal.tsx`

**Interfaces:**
- Responsive layout containers: `p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8`
- Table wrapper: `<div className="overflow-x-auto -mx-px"><table className="w-full text-sm min-w-[600px]">`

- [ ] **Step 1: Update `Dashboard.tsx`**
  - Replace `p-8` with `p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8`.
  - Ensure metric cards grid adapts cleanly: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4`.
  - Ensure Quick Start and Activity sections stack cleanly on mobile.

- [ ] **Step 2: Update `Groups.tsx`**
  - Replace `p-8` with `p-4 sm:p-6 lg:p-8 space-y-6`.
  - Header actions: `flex flex-col sm:flex-row gap-3 w-full sm:w-auto`.
  - Wrap table in `<div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">` so group names, URLs, and action toggles never distort or clip.
  - Responsive modals: Ensure modal inputs and sync group list adapt to mobile widths.

- [ ] **Step 3: Update `Posts.tsx`**
  - Replace `p-8` with `p-4 sm:p-6 lg:p-8 space-y-6`.
  - Post items: `flex flex-col sm:flex-row gap-4 sm:gap-5`.
  - Thumbnail preview in modal: change `grid-cols-5` to `grid-cols-3 sm:grid-cols-5 gap-2` for touch usability.
  - Lightbox modal: ensure image preview scales with `max-w-full max-h-[80vh] object-contain`.

- [ ] **Step 4: Update `Modal.tsx`**
  - Set outer padding to `p-3 sm:p-4`.
  - Set inner content padding to `px-4 py-4 sm:px-6 sm:py-5`.
  - Set dialog header to `px-4 py-3.5 sm:px-6 sm:py-4`.

- [ ] **Step 5: Verify build passes**
  Run: `bun --cwd frontend run build`
  Expected: Clean build.

---

### Task 4: Make Data Pages (`Schedules`, `Logs`, `Session`) Responsively Scaled

**Files:**
- Modify: `frontend/src/pages/Schedules.tsx`
- Modify: `frontend/src/pages/Logs.tsx`
- Modify: `frontend/src/pages/Session.tsx`

**Interfaces:**
- Table horizontal overflow containers and responsive filters.

- [ ] **Step 1: Update `Schedules.tsx`**
  - Replace `p-8` with `p-4 sm:p-6 lg:p-8 space-y-6`.
  - Wrap schedules table in `<div className="overflow-x-auto"><table className="w-full text-sm min-w-[620px]">`.
  - New Schedule Modal: adjust delays grid from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4`.

- [ ] **Step 2: Update `Logs.tsx`**
  - Replace `p-8` with `p-4 sm:p-6 lg:p-8 space-y-6`.
  - Header filter controls: `flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto`.
  - Wrap logs table in `<div className="overflow-x-auto"><table className="w-full text-sm min-w-[680px]">`.
  - Ensure error column text truncates or wraps safely (`max-w-[180px] sm:max-w-xs truncate`).

- [ ] **Step 3: Update `Session.tsx`**
  - Replace `p-8` with `p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8`.
  - Mode switch tabs: `grid grid-cols-2 sm:flex gap-1.5 p-1 bg-zinc-200/60 rounded-xl w-full sm:w-fit`.
  - Wrap accounts table in `<div className="overflow-x-auto"><table className="w-full text-sm min-w-[580px]">`.
  - Proxy and session forms: ensure button rows and textareas fit mobile widths.

- [ ] **Step 4: Verify build passes**
  Run: `bun --cwd frontend run build`
  Expected: Clean build.

---

### Task 5: Mobile Viewport Audit & E2E Verification

**Files:**
- Test with Playwright on iPhone SE (375x667), iPhone 14 (390x844), Tablet (768x1024), and Desktop (1280x800).
- Run existing UI E2E test suite.

- [ ] **Step 1: Execute automated mobile overflow verification script**
  Run: `bun test-mobile-audit.ts`
  Expected: Zero horizontal scroll overflow on all routes and viewports; mainWidth equals device clientWidth.

- [ ] **Step 2: Execute frontend build & lint**
  Run: `bun --cwd frontend run build`
  Expected: Zero TypeScript or Vite compilation errors.

- [ ] **Step 3: Clean up temporary audit scripts**
  Remove `test-mobile-audit.ts` before committing.

---
