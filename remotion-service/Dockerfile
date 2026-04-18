FROM node:20-slim

# Dipendenze Chrome per Remotion
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libxkbcommon0 \
  libnss3 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium

WORKDIR /app

# Dipendenze Node
COPY remotion-service/package.json ./
RUN npm install --omit=dev

# Bundle Remotion (pre-compilato nel build step)
COPY remotion-bundle/ ./bundle/

# Server
COPY remotion-service/server.js ./

EXPOSE 8090

CMD ["node", "server.js"]
