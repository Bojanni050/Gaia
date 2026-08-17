# The Gaia API. Build context is the REPO ROOT (see docker-compose.yml),
# because the image bakes in the canonical SOUL document:
#
#   COPY frontend/src/gaia/identity/soul.md
#
# One source of truth for identity: the repo's constitution file, read at
# container start. A Gaia API without SOUL refuses to start.

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY services/gaia-api/package.json ./package.json
RUN npm install --omit=dev

COPY services/gaia-api/src ./src
COPY frontend/src/gaia/identity/soul.md ./soul.md

ENV SOUL_PATH=/app/soul.md
EXPOSE 8891
CMD ["node", "src/server.js"]
