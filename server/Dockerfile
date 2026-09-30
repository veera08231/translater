# Any host that builds Docker images (Render, Railway, Fly.io, a VPS...).
# Build from inside the server folder:
#   docker build -t sanskrit-api ./server
# Run:
#   docker run -p 3001:3001 -e OPENAI_API_KEY=sk-... sanskrit-api

FROM node:22-alpine

WORKDIR /app

# Install only what the API needs.
COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Only what the server reads — the app never needs this file.
EXPOSE 3001

USER node

# Render/Railway read this; otherwise the platform health check is used.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.js"]