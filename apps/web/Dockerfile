FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web

WORKDIR /app/apps/web

ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm run build

FROM nginx:alpine AS runtime

COPY --from=build /app/apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/nginx.https.conf /etc/nginx/https.conf
COPY --from=build /app/apps/web/nginx-app.conf /etc/nginx/snippets/app.conf
COPY --from=build /app/apps/web/nginx-proxy-api.conf /etc/nginx/snippets/proxy-api.conf
COPY --from=build /app/apps/web/40-select-tls.sh /docker-entrypoint.d/40-select-tls.sh
RUN chmod +x /docker-entrypoint.d/40-select-tls.sh
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
