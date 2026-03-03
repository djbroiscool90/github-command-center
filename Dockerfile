# ─── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY index.html vite.config.ts tsconfig*.json postcss.config.cjs tailwind.config.cjs ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

# ─── Stage 2: Build Backend ───────────────────────────────────────────────────
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /github-command-center .

# ─── Stage 3: Final Image ─────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk --no-cache add ca-certificates git

WORKDIR /app

# Copy compiled binary
COPY --from=backend-builder /github-command-center ./github-command-center

# Copy built frontend assets (served by Go binary)
COPY --from=frontend-builder /app/dist ./dist
COPY --from=frontend-builder /app/public ./public

# Runtime configuration
EXPOSE 8765

ENV GIN_MODE=release

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8765/api/github/user || exit 1

ENTRYPOINT ["./github-command-center"]
