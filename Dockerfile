FROM node:22-bookworm-slim AS base
WORKDIR /app

# Next.js evaluates API modules during its production build. Compose replaces
# this harmless value with the real server-only DATABASE_URL at runtime.
ENV DATABASE_URL="postgresql://omnicrm:build-only@postgres:5432/omnicrm?schema=public"

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
