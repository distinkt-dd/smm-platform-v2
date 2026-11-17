# Локальные проверки и Docker Desktop

Агент выполняет проверки в доступном окружении и фиксирует команды, результаты и непроверенные сценарии в задаче или PR. Для проверки, которую можно выполнить только в окружении Дмитрия, агент указывает каталог, команду и ожидаемый результат.

## Первый запуск

В Windows используй Node.js 26.13.0 с npm 11.20.0 как ориентир локального окружения. Эти версии указаны в [отчёте о проверке frontend](https://github.com/distinkt-dd/smm-platform-v2/issues/1). Оба Dockerfile используют Node.js 24 и npm из базового образа. [Проверка Docker Compose](https://github.com/distinkt-dd/smm-platform-v2/issues/2) подтверждает запуск обоих приложений в этом окружении.

Проверь локальные версии командами `node --version` и `npm --version`. Создай `backend/.env` по инструкции ниже. Из каталога `backend` выполни `npm ci` и `npm run start:dev`. В отдельном терминале из `frontend` выполни `npm ci` и `npm run dev`. Backend по умолчанию отвечает на `http://localhost:3000/`. Адрес frontend Vite выводит в терминале.

## Локальный PostgreSQL и переменные окружения

Скопируй пример один раз: из корня проекта выполни `Copy-Item backend/.env.example backend/.env`. Не перезаписывай существующий `.env`: в нём могут быть твои настройки. Файл исключён из Git. `DATABASE_URL` используется локальным backend и Prisma CLI; значения `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — Docker Compose. Пример согласован с портом хоста 5433. Если меняешь учётные данные или имя базы, обнови и `DATABASE_URL`. Для примера используй простые буквенно-цифровые значения: специальные символы в URL требуют отдельного кодирования. Переменные оболочки имеют приоритет над значениями файла Compose.

При запущенном Docker Desktop из корня проекта:

```powershell
docker compose --env-file backend/.env up -d db
docker compose --env-file backend/.env ps
docker compose --env-file backend/.env exec db pg_isready -U postgres -d db_name
```

Для последней команды подставь пользователя и базу из своего `.env`. Ожидаются статус `Up (healthy)` и сообщение `accepting connections`. Порт 5433 доступен только с локальной машины. Контейнер хранит данные в именованном томе: обычный `docker compose --env-file backend/.env down` удаляет контейнеры и сеть, но сохраняет том. Изменение `POSTGRES_*` не меняет существующую базу в томе автоматически.

Backend проверяет наличие непустого `DATABASE_URL` при старте, но пока не подключается к базе. Модели, миграции и подключение NestJS — следующие задачи.

## Проверки без Docker

После установки зависимостей через `npm ci` в каталоге соответствующего приложения выбери команды под задачу.

| Каталог | Команда | Что проверяет |
| --- | --- | --- |
| `backend` | `npm test` | Запускает модульные тесты. |
| `backend` | `npm run test:e2e` | Запускает сквозные тесты backend. |
| `backend`, `frontend` | `npm run build` | Собирает приложение в выбранном каталоге. |
| `frontend` | `npm run lint` | Проверяет код по правилам линтера. |

Успешный запуск тестов завершается без упавших тестов. Для сборки и линтинга ориентируйся на отсутствие ошибок и код завершения `0`. В PowerShell код последней команды можно посмотреть через `$LASTEXITCODE`.

## Проверки в Docker Desktop

Используем Docker Desktop на Windows, чтобы периодически проверять почти готовые модули в окружении, приближенном к VPS. Планируем такой запуск ближе к завершению работы над модулем.

Из корня проекта при запущенном Docker Desktop:

```powershell
docker compose --env-file backend/.env up -d --build
docker compose --env-file backend/.env ps
```

Backend и frontend должны иметь статус `Up`; если база запущена, её статус должен быть `Up (healthy)`. Backend доступен по адресу http://localhost:3000 и отвечает `Hello World!`. Frontend доступен по адресу http://localhost:8080 и показывает стартовую страницу со счётчиком.

Для проверки перезапуска выполни `docker compose --env-file backend/.env restart` и снова открой оба адреса. Для остановки и удаления контейнеров и сети Compose выполни `docker compose --env-file backend/.env down`. Собранные образы при этом сохраняются.
