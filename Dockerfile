# Build context is the repo root. Builds the Gaia web frontend (foundation
# artifact + React app) and serves it as static files — no Hermes service.

FROM node:22-slim AS build
WORKDIR /app

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
