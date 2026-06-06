FROM node:20-slim

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY tailwind.config.js /app/tailwind.config.js
COPY postcss.config.js /app/postcss.config.js
COPY next.config.mjs /app/next.config.mjs
COPY tsconfig.json /app/tsconfig.json
COPY public /app/public
COPY src /app/src

RUN npm run build

# Copy static assets for standalone mode
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]
