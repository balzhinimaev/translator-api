# Translator API

## Быстрый запуск

```bash
# 1. Настройте переменные окружения
cp .env.prod.example .env.prod
# Отредактируйте .env.prod - замените все your-*-here на реальные значения!

# 2. Запустите проект
docker-compose -f docker-compose.prod.yml up -d

# 3. Проверьте работу
curl http://localhost:3000/
```

## Управление

```bash
# Запуск
docker-compose -f docker-compose.prod.yml up -d

# Остановка
docker-compose -f docker-compose.prod.yml down

# Логи
docker-compose -f docker-compose.prod.yml logs -f

# Перезапуск
docker-compose -f docker-compose.prod.yml restart
```

## Порты

- API: 3000
- MongoDB: 27017 (открыт для внешних подключений)

## Подключение к MongoDB

```bash
# Подключение через mongosh
mongosh mongodb://MONGO_ROOT_USERNAME:MONGO_ROOT_PASSWORD@localhost:27017/MONGO_DATABASE?authSource=admin

# Подключение через MongoDB Compass
mongodb://MONGO_ROOT_USERNAME:MONGO_ROOT_PASSWORD@localhost:27017/MONGO_DATABASE?authSource=admin
```

## Хранение данных

Данные MongoDB хранятся в локальных папках:

- **Данные БД**: `./mongodb_data/` - все базы данных, коллекции и индексы
- **Конфигурация**: `./mongodb_config/` - файлы конфигурации MongoDB
- **Резервные копии**: `./backup/` - папка для backup-ов

Эти папки автоматически создаются при первом запуске и сохраняются между перезапусками контейнеров. 