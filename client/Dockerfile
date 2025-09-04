# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Assicurati che "build" in package.json faccia: ng build --configuration=production
RUN npm run build

# ---- runtime stage (nginx) ----
FROM nginx:1.27-alpine
# Copia configurazione nginx con proxy /api -> http://api:3000
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copia i file statici Angular
# Adatta il path se necessario (es: dist/frontend/browser)
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
