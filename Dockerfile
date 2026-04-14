# ==========================================
# SEVEN T - Production Dockerfile
# Multi-stage build for optimized image
# ==========================================

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
# Force IPv4 and limit Node memory heavily to prevent OOM kills
ENV NODE_OPTIONS="--max-old-space-size=768 --dns-result-order=ipv4first"

# Copy frontend package files
COPY frontend/package*.json ./

# Install all deps using Yarn (much lower memory footprint than NPM)
RUN yarn install --network-timeout 600000

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN yarn build

# ==========================================
# Stage 2: Production image
# ==========================================
FROM node:20-alpine AS production

# Only essential runtime packages (no Chromium/Puppeteer needed for Baileys)
RUN apk add --no-cache \
    ca-certificates \
    wget \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs
# Force IPv4 and limit Node memory heavily to prevent OOM kills
ENV NODE_OPTIONS="--max-old-space-size=768 --dns-result-order=ipv4first"

# Install backend production dependencies
COPY package*.json ./
# Install backend production dependencies using Yarn to avoid OOM
RUN yarn install --production --network-timeout 600000 && \
    yarn cache clean

# Copy backend source
COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create directories for persistence (uploads and whatsapp sessions)
RUN mkdir -p uploads sessions auth_info_baileys \
    && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Memory limit for Node.js (adjust based on VPS RAM)
CMD ["node", "--max-old-space-size=768", "backend/server.js"]
