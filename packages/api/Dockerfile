FROM oven/bun:alpine AS base

WORKDIR /app

# Copy the entire monorepo structure
COPY package.json bun.lockb* bunfig.toml tsconfig.json ./
COPY packages/shared packages/shared
COPY packages/api packages/api

# Install dependencies
RUN bun install --ci

# Expose the API port
EXPOSE 8080

# Start the server
WORKDIR /app/packages/api
CMD ["bun", "src/index.ts"]
