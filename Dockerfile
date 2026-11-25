# Development image: runs `next dev` with hot reload.
# Source code is bind-mounted by docker-compose.yml, so only deps are baked in.
FROM node:26-slim

# Corepack is no longer bundled with Node 25+, so install pnpm directly.
RUN npm install -g pnpm@12.23.0

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
