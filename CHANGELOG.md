# Changelog

All notable changes to GitHub Command Center are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] — 2026-03-03

### Added
- **Inline PR Detail Panel** — full PR review without leaving the app (merge, approve, request changes, add comments)
- **Inline Issue Detail Panel** — view, edit, close/reopen issues and add comments inline
- **File Browser Panel** — navigate any repository's file tree and read source files inline
- **Command Palette** (`Ctrl+K`) — fuzzy search across all tabs and repositories
- **Create PR Modal** — create pull requests with branch picker and draft support
- **Create Issue Modal** — create issues with label selector loaded from GitHub API
- **Keyboard Shortcuts Help** (`?` key) — reference card showing all keyboard shortcuts
- **Live Notification Badge** — sidebar bell icon shows unread count, refreshes every 2 minutes
- **Search Bars** in Pull Requests and Issues views — filter by title, repo, author, or label
- **PR Diff File Tree** — two-panel diff viewer with directory tree, file status badges, and dual line numbers
- **Toast Progress Bar** — animated countdown timer on all notifications
- **Ctrl+K Pill** in sidebar navigation for quick palette access
- **Workflow Automation** — real GitHub Actions data (workflows, runs, jobs, steps, logs)
- **Notification Center** — real GitHub notifications with inline PR/Issue navigation, mark-as-read
- **Activity Feed** — live GitHub events with type filtering and auto-refresh
- **Credential Auto-Config** — backend reads `.env` and exposes `/api/config` so token is set on first launch

### Changed
- Version bumped from 1.x to 2.0.0
- `PullRequestsViewer` and `IssuesTracker` now open inline panels instead of GitHub.com
- `NotificationCenter` replaced mock data with real GitHub API + inline navigation
- Toast component redesigned: cleaner dark styling, animated slide-in from right, progress bar
- Sidebar: `v2.0` badge, live notification count, Ctrl+K search pill
- `PRDetailPanel` Files tab upgraded with split-pane tree view and precise line numbering

### Fixed
- PR detection now uses Search API (`is:pr+author:@me`) to avoid including issues
- `BranchPanel` crash replaced with proper axios calls
- `RepositoryAnalytics` field mapping corrected (`stars` vs `stargazers_count`)
- Accessibility: all icon-only buttons have `title` attributes; select elements have `aria-label`

---

## [1.1.0] — 2026-02-15

### Added
- Activity Feed with real GitHub events
- Global toast system (`toast.success/error/info/warning`)
- Keyboard shortcuts `Ctrl+1…0` to switch tabs
- Branch Protection Manager
- Repository Analytics
- Code Review Analytics

### Fixed
- Missing backend endpoints (merge, apply-stash, delete-stash, delete-branch, sync, clean)
- Dashboard now loads real repos from GitHub API
- Rate limit bar in Dashboard header

---

## [1.0.0] — 2026-02-01

### Initial Release
- React 18 + TypeScript + Tailwind CSS frontend (GitHub dark theme)
- Go backend serving React SPA + proxying GitHub API on port 8765
- Tabs: Dashboard, Pull Requests, Issues, Notifications, Workflows, Settings
- Local Git tabs: Changes, Branches, Stashes, Commit History, Inline Editor
- Single binary deployment (9.9 MB)
- Debian package installer
