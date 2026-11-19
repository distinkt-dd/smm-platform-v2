# Базовая структура приложений

Backend и frontend — независимые npm-проекты. Исходный состав зависимостей взят из SMM в кармане; Tailwind CSS добавлен отдельно по запросу. Наличие пакета не означает, что его функциональность уже подключена к приложению.

Версии Node.js и npm, а также порядок первого запуска указаны в [режиме локальных проверок](../local-development.md#первый-запуск).

Для совместного запуска в Docker используются `compose.yaml`, `backend/Dockerfile` и `frontend/Dockerfile`; сервис `db` запускает PostgreSQL с именованным томом и проверкой готовности. Команды и ожидаемый результат описаны в [режиме локальных проверок](../local-development.md).

## Backend

- Точка входа: `backend/src/main.ts`; стартовый модуль: `backend/src/app.module.ts`.
- Nest CLI, TypeScript, NestJS, `@nestjs/config`, Express и Vitest; установлены также пакеты Prisma/PostgreSQL, авторизации, валидации, почты и обработки файлов из исходного проекта.
- Из `backend`: `npm ci`, `npm run start:dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm exec --no -- prisma validate` (схема проверяется без запущенной БД и без `DATABASE_URL`).
- `backend/.env.example` описывает локальное окружение. `ConfigModule` загружает `backend/.env` при запуске из каталога backend, а `backend/src/require-database-url.ts` проверяет наличие непустого `DATABASE_URL`; Prisma CLI загружает тот же файл через `backend/prisma.config.ts`. Команды Compose используют этот файл через `--env-file`.
- Схема Prisma задана в `backend/prisma/schema.prisma`, конфигурация — в `backend/prisma.config.ts`; каталог генерации `backend/src/generated/prisma` исключён из Git. Модель `User` хранится в таблице `users`; первая миграция находится в `backend/prisma/migrations`. Применение миграций: `npm exec --no -- prisma migrate deploy` из `backend` при доступной базе. Доступны регистрация, вход с access-токеном и защищённый маршрут текущего пользователя.

### Модули backend

| Модуль | Контракт | Точки входа | Зависимости | Проверки |
| --- | --- | --- | --- | --- |
| `PrismaModule` | Глобальный провайдер `PrismaService` — Prisma Client 7 с driver adapter `@prisma/adapter-pg` и пулом `pg`; метод `ping()` проверяет доступность базы запросом `SELECT 1`; установка соединения ограничена 5 с (`connectionTimeoutMillis`) | `backend/src/modules/prisma/prisma.module.ts`, `backend/src/modules/prisma/prisma.service.ts` | `@prisma/client`, `@prisma/adapter-pg`, `pg`, `EnvConfig` (`DATABASE_URL`), сгенерированный клиент | `npm test` (запрос замокан), `npm run test:e2e` (реальный PostgreSQL через `embedded-postgres` на свободном порту); запуск без базы: в логе `Database is unreachable at startup: PrismaClientKnownRequestError (P2010)` вместо `Database is connected` |
| `HealthModule` | `GET /health`: `200 {status:"ok",database:"up"}`, если база отвечает, и `503 {status:"error",database:"down"}`, если нет | `backend/src/modules/health/health.module.ts`, `backend/src/modules/health/health.controller.ts` | `PrismaModule` | `npm test`; `npm run test:e2e`: `200` на работающей базе и `503` после остановки кластера, ответ не зависает, когда база принимает соединение, но не отвечает |
| `AuthModule` | `POST /auth/register`: принимает `{email, password}`, проверяет их через `class-validator` (`ValidationPipe` с `whitelist` и `transform`), нормализует email (trim + нижний регистр), хранит пароль только как хеш argon2 и отвечает `201 {id, email, createdAt}` без поля `password`; повторный email — `409` (нарушение уникального индекса `P2002`), невалидные данные — `400` с перечнем полей. Контракт заканчивается на регистрации | `backend/src/modules/auth/auth.controller.ts`, `auth.service.ts`, `repositories/auth.repository.ts`, `dto/registration-user.dto.ts` | `PrismaModule`, `class-validator`, `class-transformer`, `argon2`; глобальный `ValidationPipe` в `backend/src/main.ts` | `npm test`: сервис с моком репозитория, репозиторий с моком `PrismaService` (включая `P2002`), правила и нормализация DTO через `class-validator`; `npm run test:e2e`: реальный PostgreSQL через `embedded-postgres`, миграции из `backend/prisma/migrations`, проверки `201`, `409`, `400`, отсечения лишних полей и параллельных запросов с одним email |
| Вход и токены (`AuthModule`, `TokenModule`) | `POST /auth/login`: `{email, password}` → `200 {accessToken, user: {id, email, createdAt}}`; неверные данные — `401`. `GET /auth/me` возвращает `{id, email, createdAt}` при действительном Bearer access-токене и существующем пользователе. JWT содержит `sub` и `email`, срок действия — 1 час; refresh и выход не реализованы. CORS разрешает `localhost:5173` и `localhost:8080` | `backend/src/modules/auth/auth.controller.ts`, `auth.service.ts`, `strategies/jwt.strategy.ts`, `guards/jwt-auth.guard.ts`, `repositories/auth.repository.ts`, `backend/src/modules/token/token.module.ts`, `token.service.ts`, `backend/src/common/configurations/env/cors.ts` | `PrismaModule`, `argon2`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `EnvConfig` (`JWT_SECRET`) | `npm test`; `npm run test:e2e`: вход и `me`, неверный пароль, отсутствие токена, неверная подпись, истёкший токен, разрешённые и посторонний CORS origin |

Готовность базы проверяется только реальным запросом: в режиме driver adapter `$connect()` соединение не открывает, потому что пул `pg` подключается лениво при первом запросе. Поэтому при недоступной базе приложение стартует, пишет ошибку в лог и отвечает `503` на проверку готовности, а падают только запросы к базе.

Пул получает `connectionTimeoutMillis: 5000`: без таймаута запрос к базе, которая принимает TCP-соединение, но не отвечает, ждал бы бесконечно — `GET /health` не вернул бы `503`, а `pool.end()` при остановке не завершился бы.

При остановке приложения соединение закрывается: точка входа `backend/src/main.ts` включает `app.enableShutdownHooks()`, поэтому по `SIGTERM` и `SIGINT` выполняется `onModuleDestroy` с `$disconnect()` и `pool.end()`. В контейнере `backend/Dockerfile` запускает `node dist/main.js` без обёртки npm, чтобы сигнал остановки приходил процессу Node напрямую.

## Frontend

- Точка входа: `frontend/src/main.tsx`; стартовый компонент: `frontend/src/App.tsx`; маршрут `/` ведёт на `HomePage` из `frontend/src/pages`.
- Слои FSD сверху вниз: `pages` → `widgets` → `shared`; импорт допустим только вниз. Страницы лежат в `frontend/src/pages`, общие layouts (`AuthLayout`, `MainLayout`) — в `frontend/src/pages/layouts`, самостоятельные блоки интерфейса — в `frontend/src/widgets`.
- Каркас страниц: `MainLayout` держит общую шапку `Header` из `frontend/src/widgets/header` (логотип и ссылки на вход и регистрацию, активный маршрут выделен через `NavLink`) и слот `<main>`; `AuthLayout` вложен в него и сужает колонку форм до `max-w-preview`. Маршрут `*` тоже вложен в `MainLayout`, поэтому страница 404 показывается в общем каркасе с шапкой.
- React, TypeScript, Vite и Tailwind CSS через `@tailwindcss/vite`; также установлены Redux Toolkit, React Router и инструменты тестирования из исходного проекта.
- Базовые стили и токены дизайн-системы: `frontend/src/index.css` (`@theme` Tailwind CSS v4); отдельного `App.css` нет. Состав токенов и утилит описан в [дизайн-системе](../design-system.md#токены-в-коде).
- Из `frontend`: `npm ci`, `npm run dev`, `npm run build`, `npm run lint`.
- Хранилище и взаимодействие с backend пока не настроены. Экраны — заготовка, вёрстка опирается на готовые токены.
