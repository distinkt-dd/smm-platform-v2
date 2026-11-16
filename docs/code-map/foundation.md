# Базовая структура приложений

Backend и frontend — независимые npm-проекты. Исходный состав зависимостей взят из SMM в кармане; Tailwind CSS добавлен отдельно по запросу. Наличие пакета не означает, что его функциональность уже подключена к приложению.

## Backend

- Точка входа: `backend/src/main.ts`; стартовый модуль: `backend/src/app.module.ts`.
- Nest CLI, TypeScript, NestJS, Express и Vitest; установлены также пакеты Prisma/PostgreSQL, авторизации, валидации, почты и обработки файлов из исходного проекта.
- Из `backend`: `npm ci`, `npm run start:dev`, `npm run build`, `npm test`, `npm run test:e2e`.
- Схема Prisma, подключение к БД, авторизация и другие прикладные модули пока не настроены.

## Frontend

- Точка входа: `frontend/src/main.tsx`; стартовый компонент: `frontend/src/App.tsx`.
- React, TypeScript, Vite и Tailwind CSS через `@tailwindcss/vite`; также установлены Redux Toolkit, React Router и инструменты тестирования из исходного проекта.
- Из `frontend`: `npm ci`, `npm run dev`, `npm run build`, `npm run lint`.
- Роутинг, хранилище и взаимодействие с backend пока не настроены. Страница — шаблон Vite.
