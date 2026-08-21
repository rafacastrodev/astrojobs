FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY . .

WORKDIR /app/apps/web

# Vite inlines VITE_* at build time, and .env is dockerignored so it never
# reaches this stage. These come in as build args instead — see the frontend
# service in docker-compose.yml. They are public client identifiers, not
# secrets; never add a build arg for a value that must stay private, since
# build args are visible in the image history.
ARG VITE_API_URL=""
ARG VITE_COGNITO_AUTHORITY=""
ARG VITE_COGNITO_CLIENT_ID=""
ARG VITE_COGNITO_DOMAIN=""
ARG VITE_COGNITO_SCOPE=""
ARG VITE_COGNITO_REDIRECT_PATH=""
ARG VITE_COGNITO_LOGOUT_PATH=""
ARG VITE_COGNITO_PROVIDERS=""

ENV VITE_API_URL=$VITE_API_URL \
    VITE_COGNITO_AUTHORITY=$VITE_COGNITO_AUTHORITY \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_COGNITO_DOMAIN=$VITE_COGNITO_DOMAIN \
    VITE_COGNITO_SCOPE=$VITE_COGNITO_SCOPE \
    VITE_COGNITO_REDIRECT_PATH=$VITE_COGNITO_REDIRECT_PATH \
    VITE_COGNITO_LOGOUT_PATH=$VITE_COGNITO_LOGOUT_PATH \
    VITE_COGNITO_PROVIDERS=$VITE_COGNITO_PROVIDERS

RUN CI=true pnpm run build

FROM nginx:alpine

COPY --from=build /app/apps/web/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
