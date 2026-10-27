# Stage 1: Build Frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
# Remove electron stuffs and api from package.json
RUN node -e "const fs = require('fs'); const filePath = './package.json'; \
             let rawdata = fs.readFileSync(filePath); let packageJson = JSON.parse(rawdata); \
             if (packageJson.devDependencies) { \
               delete packageJson.devDependencies.electron; \
               delete packageJson.devDependencies['electron-builder']; \
             } \
             if (packageJson.dependencies) { \
               delete packageJson.dependencies['electron-is-dev']; \
               delete packageJson.dependencies['electron-log']; \
               delete packageJson.dependencies['electron-store']; \
               delete packageJson.dependencies['electron-updater']; \
               delete packageJson.dependencies.kugoumusicapi; \
             } \
             fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));"
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:docker

# Stage 2: Setup Combined App
FROM node:20-alpine
WORKDIR /app

RUN corepack enable

COPY ./docker/ .
COPY --from=frontend /app/dist/ ./dist/

RUN pnpm install --frozen-lockfile

CMD ["pnpm", "run", "start"]
