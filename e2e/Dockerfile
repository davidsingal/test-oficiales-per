# End-to-end test runner: Node + Playwright's Chromium.
# Run through docker compose (service "e2e", profile "test"), against the dev app.
FROM node:26-slim

RUN npm install -g pnpm@12.23.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Browsers live outside node_modules, so the bind-mounted source doesn't hide them.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pnpm exec playwright install --with-deps chromium

ENTRYPOINT ["pnpm", "exec", "playwright", "test"]
