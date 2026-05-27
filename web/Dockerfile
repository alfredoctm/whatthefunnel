# syntax=docker/dockerfile:1.7

# ---- Build the ui ----
FROM node:22-alpine AS ui-build
WORKDIR /app

COPY ui/package.json ui/package-lock.json ./
RUN npm ci

COPY ui/tailwind.config.ts ui/index.html ./
COPY ui/src ./src

RUN npm run build

# ---- nginx serves built UI + reverse-proxies /api/* to the api service ----
FROM nginx:alpine

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=ui-build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
