FROM node:20-alpine AS build
ARG CACHE_BUST=1

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps && npm cache clean --force

COPY . ./
RUN rm -rf build
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]