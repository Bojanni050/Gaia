# The Gaia API. Build context is this service's own directory (see
# docker-compose.yml) — identity is self-contained here since SOUL moved
# to services/gaia-api/identity/ (centralized in Gaia Cloud, versioned).
# One source of truth for identity: the repo's constitution file, read at
# container start. A Gaia API without SOUL refuses to start.

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./package.json
RUN npm install --omit=dev

COPY src ./src
COPY identity/soul.md ./soul.md

ENV SOUL_PATH=/app/soul.md
EXPOSE 8891
CMD ["node", "src/server.js"]
