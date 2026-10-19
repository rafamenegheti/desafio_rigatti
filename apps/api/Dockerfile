# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
# Os package.json de todos os workspaces são necessários para o npm ci reconhecer o lockfile
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api
COPY apps/api apps/api
RUN npm run build -w apps/api

# ---- runtime (só dependências de produção, usuário sem privilégios) ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --omit=dev
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3333
CMD ["node", "dist/server.js"]
