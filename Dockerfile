FROM node:24-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN VITE_BASE=/ npm run build

FROM node:24-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json backend/server.js ./backend/
COPY --from=frontend /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "backend/server.js"]
