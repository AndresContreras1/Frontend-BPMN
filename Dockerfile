# Etapa 1: compila la SPA en modo producción
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

# Etapa 2: nginx sirve los archivos estáticos y reenvía /api al backend
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend-bpmn/browser /usr/share/nginx/html
EXPOSE 80
