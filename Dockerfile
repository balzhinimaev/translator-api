# Базовый образ Node.js
FROM node:18-alpine AS base

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Стадия для разработки
FROM base AS development

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Копируем исходный код
COPY . .

# Запускаем в режиме разработки
CMD ["npm", "run", "dev"]

# Стадия для сборки
FROM base AS build

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем проект
RUN npm run build

# Продакшн стадия
FROM node:18-alpine AS production

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем только продакшн зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем собранное приложение
COPY --from=build /app/dist ./dist

# Создаем директорию для временных файлов
RUN mkdir -p temp

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Меняем владельца файлов
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Открываем порт
EXPOSE 3000

# Проверка здоровья
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Запускаем приложение
CMD ["node", "dist/app.js"] 