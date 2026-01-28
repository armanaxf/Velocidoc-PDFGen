# Build stage - use official Bun image
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files from root
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/api ./packages/api
COPY tsconfig.json ./

# Production stage - slim image
FROM oven/bun:1-slim

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api ./packages/api
COPY --from=builder /app/package.json ./

# Create templates directory
RUN mkdir -p /app/packages/api/templates

# Copy templates
COPY packages/api/templates ./packages/api/templates

WORKDIR /app/packages/api

# Railway uses PORT env var
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/index.ts"]
