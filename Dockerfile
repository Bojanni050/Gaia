# Build context is the repo root. Builds the Gaia web frontend (foundation
# artifact + React app) and serves it as static files — no Hermes service.

FROM node:22-slim AS build
WORKDIR /app

# CRA exposes only REACT_APP_* variables and embeds them at build time.
# These are deliberately non-secret: nginx/Plesk injects the Hermes key.
ARG REACT_APP_REASON_ENGINE_URL=/api/hermes/v1
ARG REACT_APP_REASON_ENGINE_MODEL=hermes-agent
ENV REACT_APP_REASON_ENGINE_URL=$REACT_APP_REASON_ENGINE_URL
ENV REACT_APP_REASON_ENGINE_MODEL=$REACT_APP_REASON_ENGINE_MODEL

COPY package.json package-lock.json ./
RUN npm install

COPY foundation ./foundation
COPY docs ./docs

COPY frontend/package.json frontend/yarn.lock ./frontend/
RUN cd frontend && yarn install --frozen-lockfile

COPY frontend ./frontend
RUN npm run build:web

FROM nginx:1.27-alpine
COPY --from=build /app/frontend/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
