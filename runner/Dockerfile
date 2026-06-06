FROM node:20-slim

# Install ca-certificates for TLS (required by Codex CLI Rust binary)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# Install Codex CLI globally (required by @openai/codex-sdk)
RUN npm install -g @openai/codex@latest

# Create Codex config directory and copy config
RUN mkdir -p /root/.codex
COPY codex-config.toml /root/.codex/config.toml

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY tsconfig.json /app/tsconfig.json
COPY src /app/src

RUN npm run build

ENV NODE_ENV=production
EXPOSE 8081

CMD ["node", "dist/server.js"]
