FROM node:20-alpine AS base

WORKDIR /app

# Copy the entire monorepo structure
COPY package.json bun.lockb* bunfig.toml tsconfig.json ./
COPY packages/shared packages/shared
COPY packages/api packages/api

# Install Bun (for package management compatibility)
RUN npm install -g bun

# Install dependencies using Bun
RUN bun install --ci

# Expose the API port
EXPOSE 8080

# Start the server using npm start (which uses tsx via Node)
WORKDIR /app/packages/api
CMD ["npm", "start"]
