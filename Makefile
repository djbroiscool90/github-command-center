# GitHub Command Center — Makefile
# Usage: make [target]

BINARY   := github-command-center
VERSION  := 2.0.0
GOFLAGS  := -ldflags="-s -w -X main.Version=$(VERSION)"

.PHONY: all build build-frontend build-backend install uninstall clean docker docker-run dev lint help

## all: Build frontend + backend (default)
all: build

## build: Compile frontend and backend
build: build-frontend build-backend

## build-frontend: Compile React/TypeScript with Vite
build-frontend:
	@echo "→ Building frontend..."
	npm run build

## build-backend: Compile Go binary
build-backend:
	@echo "→ Building backend..."
	cd backend && go build $(GOFLAGS) -o ../$(BINARY) .

## install: Install binary + desktop launcher to local machine
install: build
	@echo "→ Installing $(BINARY) to /usr/local/bin..."
	sudo cp $(BINARY) /usr/local/bin/$(BINARY)
	@echo "→ Installing desktop entry..."
	sudo mkdir -p /usr/share/$(BINARY)
	sudo cp -r dist/ /usr/share/$(BINARY)/dist
	sudo cp -r public/ /usr/share/$(BINARY)/public
	@echo "→ Creating systemd service..."
	sudo cp debian-package/github-command-center.service /etc/systemd/system/ 2>/dev/null || true
	@sudo bash -c 'cat > /usr/share/applications/github-command-center.desktop << EOF\n[Desktop Entry]\nName=GitHub Command Center\nComment=Self-hosted GitHub Desktop alternative\nExec=/usr/local/bin/github-command-center\nIcon=/usr/share/github-command-center/public/icon.png\nTerminal=false\nType=Application\nCategories=Development;VersionControl;\nEOF'
	@echo "✓ Installation complete. Run: github-command-center"

## uninstall: Remove installation
uninstall:
	sudo rm -f /usr/local/bin/$(BINARY)
	sudo rm -rf /usr/share/$(BINARY)
	sudo rm -f /usr/share/applications/github-command-center.desktop
	sudo systemctl disable github-command-center 2>/dev/null || true
	sudo rm -f /etc/systemd/system/github-command-center.service
	@echo "✓ Uninstalled"

## clean: Remove build artifacts
clean:
	rm -rf dist/ $(BINARY)
	cd backend && go clean

## docker: Build Docker image
docker:
	docker build -t github-command-center:$(VERSION) -t github-command-center:latest .

## docker-run: Run in Docker (binds to localhost:8765)
docker-run:
	docker run --rm -p 8765:8765 \
		-e GITHUB_TOKEN=$${GITHUB_TOKEN} \
		-e GITHUB_USERNAME=$${GITHUB_USERNAME} \
		github-command-center:latest

## dev: Start Vite dev server + Go backend concurrently
dev:
	@echo "→ Starting development servers..."
	@trap 'kill 0' INT; \
	(cd backend && go run .) & \
	npm run dev & \
	wait

## lint: Run TypeScript + Go linters
lint:
	npx tsc --noEmit
	cd backend && go vet ./...

## help: Show this help
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'
