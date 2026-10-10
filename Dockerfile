FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXTAUTH_URL=http://localhost:3000
ARG DATABASE_URL=postgresql://postgres:build-only@127.0.0.1:5432/eduva?schema=public
ARG NEXTAUTH_SECRET=build-only-placeholder-not-for-runtime
ENV NEXTAUTH_URL=${NEXTAUTH_URL} DATABASE_URL=${DATABASE_URL} NEXTAUTH_SECRET=${NEXTAUTH_SECRET} NODE_ENV=production
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/admin-server ./admin-server
COPY --from=build /app/package.json ./package.json
EXPOSE 3000 4000
CMD ["npm", "run", "start"]
