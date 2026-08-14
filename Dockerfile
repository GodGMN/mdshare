# ---- Build stage: compile the React client ----
FROM node:20-slim AS build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ .
RUN npm run build

# ---- Runtime stage: Express server ----
FROM node:20-slim
WORKDIR /app

ENV PORT=20080
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=build /app/client/dist ./client/dist

EXPOSE 20080
CMD ["node", "server/index.js"]
