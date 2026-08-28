# ---- Build stage: compile the React client ----
FROM node:26-slim AS build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ .
RUN npm run build

# ---- Runtime stage: Express server ----
FROM node:26-slim
WORKDIR /app

# Pick up Debian security fixes newer than the base image
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

ENV PORT=20080
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

# npm is not needed at runtime; removing it also removes its bundled
# vulnerable dependency tree (tar, minimatch, glob, ...) from the image
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --chown=node:node server/ ./server/
COPY --from=build --chown=node:node /app/client/dist ./client/dist

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||20080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 20080
CMD ["node", "server/index.js"]
