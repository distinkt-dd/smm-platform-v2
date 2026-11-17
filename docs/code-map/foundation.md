# Базовая структура приложений

Backend и frontend — независимые npm-проекты. Исходный состав зависимостей взят из SMM в кармане; Tailwind CSS добавлен отдельно по запросу. Наличие пакета не означает, что его функциональность уже подключена к приложению.

Версии Node.js и npm, а также порядок первого запуска указаны в [режиме локальных проверок](../local-development.md#первый-запуск).

Для совместного запуска в Docker используются `compose.yaml`, `backend/Dockerfile` и `frontend/Dockerfile`; сервис `db` запускает PostgreSQL с именованным томом и проверкой готовности. Команды и ожидаемый результат описаны в [режиме локальных проверок](../local-development.md).

## Backend

- Точка входа: `backend/src/main.ts`; стартовый модуль: `backend/src/app.module.ts`.
- Nest CLI, TypeScript, NestJS, `@nestjs/config`, Express и Vitest; установлены также пакеты Prisma/PostgreSQL, авторизации, валидации, почты и обработки файлов из исходного проекта.
- Из `backend`: `npm ci`, `npm run start:dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm exec --no -- prisma validate` (схема проверяется без запущенной БД и без `DATABASE_URL`).
- `backend/.env.example` описывает локальное окружение. `ConfigModule` загружает `backend/.env` при запуске из каталога backend, а `backend/src/require-database-url.ts` проверяет наличие непустого `DATABASE_URL`; Prisma CLI загружает тот же файл через `backend/prisma.config.ts`. Команды Compose используют этот файл через `--env-file`.
- Схема Prisma задана в `backend/prisma/schema.prisma`, конфигурация — в `backend/prisma.config.ts`; каталог генерации `backend/generated/prisma` исключён из Git. Подключение NestJS к базе, миграции, рабочие модели, авторизация и другие прикладные модули пока не настроены.

## Frontend

- Точка входа: `frontend/src/main.tsx`; стартовый компонент: `frontend/src/App.tsx`.
- React, TypeScript, Vite и Tailwind CSS через `@tailwindcss/vite`; также установлены Redux Toolkit, React Router и инструменты тестирования из исходного проекта.
- Из `frontend`: `npm ci`, `npm run dev`, `npm run build`, `npm run lint`.
- Роутинг, хранилище и взаимодействие с backend пока не настроены. Страница — шаблон Vite.
