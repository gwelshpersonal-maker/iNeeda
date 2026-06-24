FROM node:20-slim

# Install system dependencies needed for native modules (like better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

# Skip downloading Chrome for Puppeteer to speed up build and avoid extraction issues
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/server.cjs"]
