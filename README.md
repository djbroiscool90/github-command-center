# GitHub Command Center

[![Release](https://img.shields.io/github/v/release/paulmmoore3416/github-command-center?style=flat-square&color=blue)](https://github.com/paulmmoore3416/github-command-center/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

A powerful, self-hosted GitHub Desktop alternative built with React + Go. Manage pull requests, issues, notifications, workflows, and local git operations — all inline, without leaving the app.

> **Single binary · No Electron · No cloud sync · Runs on localhost:8765**

---

## Features

### GitHub Integration (Inline — no redirects)
| Feature | Description |
|---------|-------------|
| **PR Viewer** | Browse all your pull requests with real-time filters |
| **PR Detail Panel** | Full inline review: file tree, dual-line diff, merge, approve, request changes |
| **Issue Tracker** | Issues assigned to you, created by you, or where you're mentioned |
| **Issue Detail Panel** | Edit title/body, close/reopen, add comments — all inline |
| **Notification Center** | Real GitHub notifications — click to open PR or Issue panel directly |
| **Activity Feed** | Live event stream with type filtering, auto-refreshes every 2 min |
| **Workflow Automation** | GitHub Actions runs, job steps, and live log viewer |
| **File Browser** | Navigate any repo's file tree and read source inline |
| **Command Palette** | `Ctrl+K` fuzzy search across tabs and repositories |
| **Keyboard Shortcuts** | `?` to view all shortcuts; `Ctrl+1-0` to switch tabs |
| **Analytics** | Repository stats, language breakdown, contributor leaderboard |

### Local Git
| Feature | Description |
|---------|-------------|
| **Changes** | Stage/unstage hunks, write commit messages, push/pull |
| **Branches** | Create, switch, merge branches with drag-and-drop |
| **Stashes** | Create, apply, and delete stash entries |
| **Commit History** | Searchable log with diff viewer per commit |
| **Inline Editor** | Edit any tracked file directly in the browser |

---

## Quick Start

### Option 1 — Download Release Binary

```bash
# Download latest release for your platform from:
# https://github.com/paulmmoore3416/github-command-center/releases/latest

tar -xzf github-command-center-v2.0.0-linux-amd64.tar.gz
cp .env.example .env
# Edit .env with your GitHub token
./github-command-center
# Open http://localhost:8765
```

### Option 2 — Build from Source

**Requirements:** Node.js 20+, Go 1.21+

```bash
git clone https://github.com/paulmmoore3416/github-command-center.git
cd github-command-center

# Configure credentials
cp .env.example .env
# Edit .env → set GITHUB_TOKEN and GITHUB_USERNAME

# Build & run
make build
./github-command-center
```

Then open **http://localhost:8765** in your browser.

### Option 3 — Docker

```bash
docker run --rm -p 8765:8765 \
  -e GITHUB_TOKEN=your_token_here \
  -e GITHUB_USERNAME=your_username \
  ghcr.io/paulmmoore3416/github-command-center:latest
```

### Option 4 — System Install (Linux)

```bash
make install   # copies binary + creates desktop launcher
# Launch from Applications menu or run: github-command-center
```

---

## GitHub Token Setup

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Select scopes: `repo`, `read:user`, `notifications`, `workflow`
4. Copy the token into your `.env` file

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_USERNAME=your_username
```

The token is stored locally in your `.env` file and in browser `localStorage`. It is never sent anywhere except directly to the GitHub API.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `?` | Show keyboard shortcuts reference |
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Activity Feed |
| `Ctrl+3` | Pull Requests |
| `Ctrl+4` | Issues |
| `Ctrl+5` | Notifications |
| `Ctrl+6` | Code Reviews |
| `Ctrl+7` | Workflows |
| `Ctrl+8` | Branch Protection |
| `Ctrl+9` | Analytics |
| `Ctrl+0` | Quick Actions |
| `Esc` | Close panel / modal |

---

## Architecture

```
github-command-center/
├── backend/              # Go HTTP server (gorilla/mux)
│   ├── main.go           # Routes, git handlers, CORS, static serving
│   ├── github.go         # GitHub API types + proxy handlers
│   └── github_panels.go  # Panel-specific handlers (PR/Issue/Workflow/Search)
├── src/
│   ├── components/       # 28 React components
│   ├── store/            # Zustand state (repos, toasts, panels)
│   └── App.tsx           # Root with auto-credential loading
├── dist/                 # Built frontend (served by Go binary)
├── Dockerfile            # Multi-stage build
├── Makefile              # Build / install / dev targets
└── .env                  # Local credentials (gitignored)
```

**Technology stack:**
- **Frontend:** React 18 · TypeScript 5 · Tailwind CSS · Vite · Zustand · Axios
- **Backend:** Go 1.21 · gorilla/mux · godotenv
- **Deployment:** Single ~10 MB binary serves React SPA + proxies GitHub API

---

## Development

```bash
# Start both servers concurrently
make dev

# Frontend only (hot-reload at http://localhost:5173)
npm run dev

# Backend only
cd backend && go run .

# Type-check frontend
npx tsc --noEmit

# Lint backend
cd backend && go vet ./...
```

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes, following the existing code style
4. Run `make lint` to verify
5. Open a pull request using the provided template

See [CONTRIBUTING.md](.github/PULL_REQUEST_TEMPLATE.md) for full guidelines.

---

## License

[MIT](LICENSE) © 2026 [paulmmoore3416](https://github.com/paulmmoore3416)
