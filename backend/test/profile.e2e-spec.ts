import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import EmbeddedPostgres from 'embedded-postgres';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { EnvConfig } from '../src/common/configurations/env/env.service.js';
import { corsOptions } from '../src/common/configurations/env/cors.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';
import { findFreePort } from './support/free-port.js';

/**
 * Сквозной контракт профиля (issue #26), его услуг и фактов (issue #19).
 *
 * Тест поднимает приложение целиком с настоящим PostgreSQL
 * (`embedded-postgres` во временном каталоге), поэтому проверяет то, что не
 * видно модульным тестам: маршруты, коды ответов, тело, работу глобального
 * `ValidationPipe` (`whitelist` + `transform`), проверку владельца записи и
 * реальную запись в базу.
 *
 * Каждый сценарий получает собственного пользователя, поэтому проверки
 * не зависят от порядка запуска.
 */

const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWORD = 'password';
const JWT_SECRET = 'test-secret';

const SERVICES_PATH = '/me/profile/services';
const FACTS_PATH = '/me/profile/facts';

const PROFILE_DATA = { displayName: 'Анна', specialization: 'Стилист' };

const PROFILE_NOT_FOUND = 'Профиль не найден!';
const SERVICE_NOT_FOUND = 'Услуга не найдена!';
const FACT_NOT_FOUND = 'Факт не найден!';
const EMPTY_UPDATE = 'Нужно передать хотя бы одно поле для изменения!';

const BACKEND_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const DATABASE_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  '.tmp',
  'pg-e2e',
  randomUUID(),
);

/** Применяет миграции из `prisma/migrations` к временной базе. */
function applyMigrations(databaseUrl: string): void {
  execFileSync(
    process.execPath,
    [
      join(BACKEND_ROOT, 'node_modules', 'prisma', 'build', 'index.js'),
      'migrate',
      'deploy',
    ],
    {
      cwd: BACKEND_ROOT,
      // dotenv внутри prisma.config.ts не перезапишет уже заданный DATABASE_URL,
      // поэтому миграция уходит именно во временную базу.
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    },
  );
}

describe('Профиль, его услуги и факты (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let postgres: EmbeddedPostgres;

  beforeAll(async () => {
    await mkdir(dirname(DATABASE_DIR), { recursive: true });

    const postgresPort = await findFreePort();
    const databaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${postgresPort}/postgres?schema=public`;

    postgres = new EmbeddedPostgres({
      databaseDir: DATABASE_DIR,
      port: postgresPort,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      persistent: false,
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      onLog: () => {},
      onError: (message) => console.error(message),
    });

    await postgres.initialise();
    await postgres.start();
    applyMigrations(databaseUrl);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EnvConfig)
      .useValue({ databaseUrl, jwtSecret: JWT_SECRET })
      .compile();

    app = moduleRef.createNestApplication();
    app.enableCors(corsOptions);

    // Та же настройка, что в backend/src/main.ts: иначе e2e проверял бы
    // приложение без валидации и пропускал бы «лишние» поля.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();

    prisma = app.get(PrismaService);
  }, 180_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (postgres) {
      await postgres.stop();
    }
  }, 60_000);

  /** Уникальный email: база одна на весь файл. */
  const uniqueEmail = () => `${randomUUID()}@example.com`;

  /** Регистрирует и логинит нового пользователя, возвращает Bearer-токен. */
  async function registerAndLogin(): Promise<{ userId: string; token: string }> {
    const credentials = { email: uniqueEmail(), password: 'password123' };

    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);

    const cookies = login.headers['set-cookie'] as unknown as string[];
    const accessToken = cookies.find((cookie) =>
      cookie.startsWith('access_token='),
    )!;

    return {
      userId: registration.body.id as string,
      token: accessToken.split(';')[0].slice('access_token='.length),
    };
  }

  function bearer(token: string): string {
    return `Bearer ${token}`;
  }

  /** Создаёт профиль через публичный маршрут и возвращает его id. */
  async function createProfileFor(token: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .put('/me/profile')
      .set('Authorization', bearer(token))
      .send(PROFILE_DATA)
      .expect(200);

    return response.body.id as string;
  }

  /** Пользователь с готовым профилем: предусловие всех CRUD-сценариев. */
  async function userWithProfile(): Promise<{
    userId: string;
    token: string;
    profileId: string;
  }> {
    const { userId, token } = await registerAndLogin();
    const profileId = await createProfileFor(token);

    return { userId, token, profileId };
  }

  describe('Профиль', () => {
    const ABOUT = 'Делаю аккуратный макияж и уход';

    it('отвечает 404 до создания профиля', async () => {
      const { token } = await registerAndLogin();

      const response = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', bearer(token))
        .expect(404);

      expect(response.body.message).toBe(PROFILE_NOT_FOUND);
    });

    it('создаёт профиль и отдаёт его без описания', async () => {
      const { userId, token } = await registerAndLogin();

      const created = await request(app.getHttpServer())
        .put('/me/profile')
        .set('Authorization', bearer(token))
        .send(PROFILE_DATA)
        .expect(200);

      expect(created.body).toEqual({
        id: expect.any(String),
        displayName: 'Анна',
        specialization: 'Стилист',
        about: null,
        confirmedFacts: [],
        services: [],
      });

      const stored = await prisma.masterProfile.findUnique({
        where: { userId },
      });
      expect(stored).toMatchObject({
        displayName: 'Анна',
        specialization: 'Стилист',
        about: null,
      });

      const read = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', bearer(token))
        .expect(200);
      expect(read.body).toEqual(created.body);
    });

    it('сохраняет, очищает и не стирает описание при пропуске поля', async () => {
      const { userId, token } = await registerAndLogin();
      const auth = bearer(token);

      const withAbout = await request(app.getHttpServer())
        .put('/me/profile')
        .set('Authorization', auth)
        .send({ ...PROFILE_DATA, about: ABOUT })
        .expect(200);
      expect(withAbout.body.about).toBe(ABOUT);

      // Поле не передано — описание остаётся прежним.
      const skipped = await request(app.getHttpServer())
        .put('/me/profile')
        .set('Authorization', auth)
        .send(PROFILE_DATA)
        .expect(200);
      expect(skipped.body.about).toBe(ABOUT);

      // Пустая строка — явная очистка.
      const cleared = await request(app.getHttpServer())
        .put('/me/profile')
        .set('Authorization', auth)
        .send({ ...PROFILE_DATA, about: '' })
        .expect(200);
      expect(cleared.body.about).toBeNull();

      expect(
        await prisma.masterProfile.findUnique({ where: { userId } }),
      ).toMatchObject({ about: null });

      await request(app.getHttpServer())
        .put('/me/profile')
        .set('Authorization', auth)
        .send({ ...PROFILE_DATA, about: ABOUT })
        .expect(200);

      // `null` в поле — та же очистка, что и пустая строка.
      const clearedWithNull = await request(app.getHttpServer())
        .put('/me/profile')
        .set('Authorization', auth)
        .send({ ...PROFILE_DATA, about: null })
        .expect(200);
      expect(clearedWithNull.body.about).toBeNull();
    });

    it('обрезает пробелы и отклоняет невалидное описание, не меняя сохранённое', async () => {
      const { token } = await registerAndLogin();
      const auth = bearer(token);

      const trimmed = await request(app.getHttpServer())
        .put('/me/profile')
        .set('Authorization', auth)
        .send({ ...PROFILE_DATA, about: `  ${ABOUT}  ` })
        .expect(200);
      expect(trimmed.body.about).toBe(ABOUT);

      const invalidCases = [
        {
          body: { ...PROFILE_DATA, about: 'коротко' },
          message: 'О себе не должно быть меньше 10 символов',
        },
        {
          body: { ...PROFILE_DATA, about: 'я'.repeat(251) },
          message: 'О себе не должно превышать 250 символов',
        },
        {
          body: { ...PROFILE_DATA, about: 123 },
          message: 'О себе должно быть строкой',
        },
        {
          body: { displayName: 'Ан', specialization: 'Стилист' },
          message: 'Имя пользователя не должно быть меньше 3 символов',
        },
      ];

      for (const { body, message } of invalidCases) {
        const response = await request(app.getHttpServer())
          .put('/me/profile')
          .set('Authorization', auth)
          .send(body)
          .expect(400);
        // Тексты важны для frontend: по ним ошибка `400` раскладывается по полям.
        expect(response.body.message).toContain(message);
      }

      const stored = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', auth)
        .expect(200);
      expect(stored.body.about).toBe(ABOUT);
    });

    it('не открывает маршрут без токена', async () => {
      await request(app.getHttpServer()).get('/me/profile').expect(401);

      await request(app.getHttpServer())
        .put('/me/profile')
        .send(PROFILE_DATA)
        .expect(401);
    });
  });

  describe('Услуги', () => {
    it('создаёт, изменяет и удаляет услугу', async () => {
      const { token, profileId } = await userWithProfile();
      const auth = bearer(token);

      const created = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', auth)
        .send({ title: 'Стрижка', description: 'Женская стрижка' })
        .expect(201);

      // Ровно публичные поля: masterProfileId и timestamps наружу не уходят.
      expect(created.body).toEqual({
        id: expect.any(String),
        title: 'Стрижка',
        description: 'Женская стрижка',
      });

      const updated = await request(app.getHttpServer())
        .patch(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .send({ title: 'Стрижка и укладка' })
        .expect(200);

      // Меняем одно поле — второе остаётся прежним.
      expect(updated.body).toEqual({
        id: created.body.id,
        title: 'Стрижка и укладка',
        description: 'Женская стрижка',
      });

      const stored = await prisma.service.findUnique({
        where: { id: created.body.id },
      });
      expect(stored).toMatchObject({
        title: 'Стрижка и укладка',
        description: 'Женская стрижка',
        masterProfileId: profileId,
      });

      await request(app.getHttpServer())
        .delete(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .expect(204);

      expect(
        await prisma.service.findUnique({ where: { id: created.body.id } }),
      ).toBeNull();
    });

    it('создаёт услугу без описания и отдаёт его как null', async () => {
      const { token } = await userWithProfile();
      const auth = bearer(token);

      const created = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', auth)
        .send({ title: 'Маникюр' })
        .expect(201);

      expect(created.body).toEqual({
        id: expect.any(String),
        title: 'Маникюр',
        description: null,
      });

      // Явный `null` в необязательном поле — тот же результат, что и пропуск.
      const explicitNull = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', auth)
        .send({ title: 'Педикюр', description: null })
        .expect(201);

      expect(explicitNull.body).toEqual({
        id: expect.any(String),
        title: 'Педикюр',
        description: null,
      });
    });

    it('очищает описание при PATCH с null', async () => {
      const { token } = await userWithProfile();
      const auth = bearer(token);

      const created = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', auth)
        .send({ title: 'Макияж', description: 'Вечерний' })
        .expect(201);

      const updated = await request(app.getHttpServer())
        .patch(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .send({ description: null })
        .expect(200);

      expect(updated.body).toEqual({
        id: created.body.id,
        title: 'Макияж',
        description: null,
      });

      const stored = await prisma.service.findUnique({
        where: { id: created.body.id },
      });
      expect(stored?.description).toBeNull();
      expect(stored?.title).toBe('Макияж');
    });

    it('отклоняет PATCH без полей и не трогает запись', async () => {
      const { token } = await userWithProfile();
      const auth = bearer(token);

      const created = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', auth)
        .send({ title: 'Стрижка' })
        .expect(201);

      // Пустое тело: изменять нечего, значит ошибка клиента, а не запись.
      const empty = await request(app.getHttpServer())
        .patch(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .send({})
        .expect(400);
      expect(empty.body.message).toBe(EMPTY_UPDATE);

      // Только неизвестное поле: `whitelist` срезает его, изменений не остаётся.
      const unknownOnly = await request(app.getHttpServer())
        .patch(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .send({ masterProfileId: randomUUID() })
        .expect(400);
      expect(unknownOnly.body.message).toBe(EMPTY_UPDATE);

      const stored = await prisma.service.findUnique({
        where: { id: created.body.id },
      });
      expect(stored?.title).toBe('Стрижка');
    });

    it('отклоняет PATCH с невалидными полями и не трогает запись', async () => {
      const { token } = await userWithProfile();
      const auth = bearer(token);

      const created = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', auth)
        .send({ title: 'Стрижка', description: 'Женская' })
        .expect(201);

      const invalidCases = [
        {
          body: { title: 'Аб' },
          message: 'Название услуги не должно быть меньше 3 символов!',
        },
        {
          body: { title: 'я'.repeat(51) },
          message: 'Название услуги не должно превышать 50 символов!',
        },
        {
          body: { title: 123 },
          message: 'Название услуги должно быть строкой!',
        },
        // `null` в обязательном поле — тоже ошибка клиента, а не 500 от базы.
        {
          body: { title: null },
          message: 'Название услуги должно быть строкой!',
        },
        {
          body: { description: 'я'.repeat(251) },
          message: 'Описание услуги не должно превышать 250 символов!',
        },
      ];

      for (const { body, message } of invalidCases) {
        const response = await request(app.getHttpServer())
          .patch(`${SERVICES_PATH}/${created.body.id}`)
          .set('Authorization', auth)
          .send(body)
          .expect(400);

        expect(response.body.message).toContain(message);
      }

      const stored = await prisma.service.findUnique({
        where: { id: created.body.id },
      });
      expect(stored).toMatchObject({
        title: 'Стрижка',
        description: 'Женская',
      });
    });

    it('отклоняет создание с невалидными полями и ничего не пишет', async () => {
      const { token, profileId } = await userWithProfile();
      const auth = bearer(token);

      const invalidCases = [
        { body: {}, message: 'Название услуги должно быть строкой!' },
        {
          body: { title: 'Аб' },
          message: 'Название услуги не должно быть меньше 3 символов!',
        },
        {
          body: { title: 'я'.repeat(51) },
          message: 'Название услуги не должно превышать 50 символов!',
        },
        {
          body: { title: 123 },
          message: 'Название услуги должно быть строкой!',
        },
        {
          body: { title: null },
          message: 'Название услуги должно быть строкой!',
        },
        {
          body: { title: 'Стрижка', description: 'я'.repeat(251) },
          message: 'Описание услуги не должно превышать 250 символов!',
        },
      ];

      for (const { body, message } of invalidCases) {
        const response = await request(app.getHttpServer())
          .post(SERVICES_PATH)
          .set('Authorization', auth)
          .send(body)
          .expect(400);

        expect(response.body.message).toContain(message);
      }

      expect(
        await prisma.service.count({ where: { masterProfileId: profileId } }),
      ).toBe(0);
    });

    it('отвечает 404 на создание без профиля и не создаёт запись', async () => {
      // Пользователь есть, профиля нет: услуге не к чему прикрепиться.
      const { token } = await registerAndLogin();
      const servicesBefore = await prisma.service.count();

      const response = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', bearer(token))
        .send({ title: 'Стрижка' })
        .expect(404);

      expect(response.body.message).toBe(PROFILE_NOT_FOUND);
      expect(await prisma.service.count()).toBe(servicesBefore);
    });

    it('отвечает 404 на чужой id и не меняет чужую запись', async () => {
      const owner = await userWithProfile();
      const stranger = await userWithProfile();

      const created = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', bearer(owner.token))
        .send({ title: 'Стрижка' })
        .expect(201);

      const patchResponse = await request(app.getHttpServer())
        .patch(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', bearer(stranger.token))
        .send({ title: 'Взлом' })
        .expect(404);
      expect(patchResponse.body.message).toBe(SERVICE_NOT_FOUND);

      const deleteResponse = await request(app.getHttpServer())
        .delete(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', bearer(stranger.token))
        .expect(404);
      expect(deleteResponse.body.message).toBe(SERVICE_NOT_FOUND);

      // Запись владельца цела и не изменилась.
      const stored = await prisma.service.findUnique({
        where: { id: created.body.id },
      });
      expect(stored?.title).toBe('Стрижка');

      const ownerProfile = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', bearer(owner.token))
        .expect(200);
      expect(ownerProfile.body.services).toHaveLength(1);

      // Чужой профиль не видит записей владельца.
      const strangerProfile = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', bearer(stranger.token))
        .expect(200);
      expect(strangerProfile.body.services).toEqual([]);
    });

    it('отвечает 404 на несуществующий id и на повторное удаление', async () => {
      const { token } = await userWithProfile();
      const auth = bearer(token);
      const missingId = randomUUID();

      const patchMissing = await request(app.getHttpServer())
        .patch(`${SERVICES_PATH}/${missingId}`)
        .set('Authorization', auth)
        .send({ title: 'Стрижка' })
        .expect(404);
      expect(patchMissing.body.message).toBe(SERVICE_NOT_FOUND);

      const deleteMissing = await request(app.getHttpServer())
        .delete(`${SERVICES_PATH}/${missingId}`)
        .set('Authorization', auth)
        .expect(404);
      expect(deleteMissing.body.message).toBe(SERVICE_NOT_FOUND);

      const created = await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .set('Authorization', auth)
        .send({ title: 'Стрижка' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .expect(204);

      const secondDelete = await request(app.getHttpServer())
        .delete(`${SERVICES_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .expect(404);
      expect(secondDelete.body.message).toBe(SERVICE_NOT_FOUND);
    });

    it('не открывает маршруты без токена', async () => {
      const id = randomUUID();
      const servicesBefore = await prisma.service.count();

      await request(app.getHttpServer())
        .post(SERVICES_PATH)
        .send({ title: 'Стрижка' })
        .expect(401);

      await request(app.getHttpServer())
        .patch(`${SERVICES_PATH}/${id}`)
        .send({ title: 'Стрижка' })
        .expect(401);

      await request(app.getHttpServer())
        .delete(`${SERVICES_PATH}/${id}`)
        .expect(401);

      expect(await prisma.service.count()).toBe(servicesBefore);
    });
  });

  describe('Факты', () => {
    it('создаёт, изменяет и удаляет факт', async () => {
      const { token, profileId } = await userWithProfile();
      const auth = bearer(token);

      const created = await request(app.getHttpServer())
        .post(FACTS_PATH)
        .set('Authorization', auth)
        .send({ text: 'Опыт работы пять лет' })
        .expect(201);

      // Ровно публичные поля: masterProfileId и timestamps наружу не уходят.
      expect(created.body).toEqual({
        id: expect.any(String),
        text: 'Опыт работы пять лет',
      });

      const updated = await request(app.getHttpServer())
        .patch(`${FACTS_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .send({ text: 'Опыт работы семь лет' })
        .expect(200);

      expect(updated.body).toEqual({
        id: created.body.id,
        text: 'Опыт работы семь лет',
      });

      const stored = await prisma.confirmedFact.findUnique({
        where: { id: created.body.id },
      });
      expect(stored).toMatchObject({
        text: 'Опыт работы семь лет',
        masterProfileId: profileId,
      });

      await request(app.getHttpServer())
        .delete(`${FACTS_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .expect(204);

      expect(
        await prisma.confirmedFact.findUnique({
          where: { id: created.body.id },
        }),
      ).toBeNull();
    });

    it('отклоняет PATCH без полей и не трогает запись', async () => {
      const { token } = await userWithProfile();
      const auth = bearer(token);

      const created = await request(app.getHttpServer())
        .post(FACTS_PATH)
        .set('Authorization', auth)
        .send({ text: 'Опыт пять лет' })
        .expect(201);

      const empty = await request(app.getHttpServer())
        .patch(`${FACTS_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .send({})
        .expect(400);
      expect(empty.body.message).toBe(EMPTY_UPDATE);

      const unknownOnly = await request(app.getHttpServer())
        .patch(`${FACTS_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .send({ masterProfileId: randomUUID() })
        .expect(400);
      expect(unknownOnly.body.message).toBe(EMPTY_UPDATE);

      const stored = await prisma.confirmedFact.findUnique({
        where: { id: created.body.id },
      });
      expect(stored?.text).toBe('Опыт пять лет');
    });

    it('отклоняет невалидный текст при создании и изменении', async () => {
      const { token, profileId } = await userWithProfile();
      const auth = bearer(token);

      // Пустое тело при создании ловит `class-validator`: `text` обязателен.
      const invalidCreateCases = [
        { body: {}, message: 'Факт должен быть строкой!' },
        {
          body: { text: 'Аб' },
          message: 'Факт не должен быть меньше 3 символов!',
        },
        {
          body: { text: 'я'.repeat(251) },
          message: 'Факт не должен превышать 250 символов!',
        },
        {
          body: { text: 123 },
          message: 'Факт должен быть строкой!',
        },
        { body: { text: null }, message: 'Факт должен быть строкой!' },
      ];

      for (const { body, message } of invalidCreateCases) {
        const createResponse = await request(app.getHttpServer())
          .post(FACTS_PATH)
          .set('Authorization', auth)
          .send(body)
          .expect(400);
        expect(createResponse.body.message).toContain(message);
      }

      expect(
        await prisma.confirmedFact.count({
          where: { masterProfileId: profileId },
        }),
      ).toBe(0);

      const created = await request(app.getHttpServer())
        .post(FACTS_PATH)
        .set('Authorization', auth)
        .send({ text: 'Опыт пять лет' })
        .expect(201);

      // Пустое тело при изменении уже проверено отдельным сценарием,
      // здесь — только невалидные значения полей.
      for (const { body, message } of invalidCreateCases.slice(1)) {
        const patchResponse = await request(app.getHttpServer())
          .patch(`${FACTS_PATH}/${created.body.id}`)
          .set('Authorization', auth)
          .send(body)
          .expect(400);
        expect(patchResponse.body.message).toContain(message);
      }

      const stored = await prisma.confirmedFact.findUnique({
        where: { id: created.body.id },
      });
      expect(stored?.text).toBe('Опыт пять лет');
    });

    it('отвечает 404 на создание без профиля', async () => {
      const { token } = await registerAndLogin();
      const factsBefore = await prisma.confirmedFact.count();

      const response = await request(app.getHttpServer())
        .post(FACTS_PATH)
        .set('Authorization', bearer(token))
        .send({ text: 'Опыт пять лет' })
        .expect(404);

      expect(response.body.message).toBe(PROFILE_NOT_FOUND);
      expect(await prisma.confirmedFact.count()).toBe(factsBefore);
    });

    it('отвечает 404 на чужой id и не меняет чужую запись', async () => {
      const owner = await userWithProfile();
      const stranger = await userWithProfile();

      const created = await request(app.getHttpServer())
        .post(FACTS_PATH)
        .set('Authorization', bearer(owner.token))
        .send({ text: 'Опыт пять лет' })
        .expect(201);

      const patchResponse = await request(app.getHttpServer())
        .patch(`${FACTS_PATH}/${created.body.id}`)
        .set('Authorization', bearer(stranger.token))
        .send({ text: 'Чужое изменение' })
        .expect(404);
      expect(patchResponse.body.message).toBe(FACT_NOT_FOUND);

      const deleteResponse = await request(app.getHttpServer())
        .delete(`${FACTS_PATH}/${created.body.id}`)
        .set('Authorization', bearer(stranger.token))
        .expect(404);
      expect(deleteResponse.body.message).toBe(FACT_NOT_FOUND);

      const stored = await prisma.confirmedFact.findUnique({
        where: { id: created.body.id },
      });
      expect(stored?.text).toBe('Опыт пять лет');

      const strangerProfile = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', bearer(stranger.token))
        .expect(200);
      expect(strangerProfile.body.confirmedFacts).toEqual([]);
    });

    it('отвечает 404 на несуществующий id и на повторное удаление', async () => {
      const { token } = await userWithProfile();
      const auth = bearer(token);
      const missingId = randomUUID();

      const patchMissing = await request(app.getHttpServer())
        .patch(`${FACTS_PATH}/${missingId}`)
        .set('Authorization', auth)
        .send({ text: 'Опыт пять лет' })
        .expect(404);
      expect(patchMissing.body.message).toBe(FACT_NOT_FOUND);

      const deleteMissing = await request(app.getHttpServer())
        .delete(`${FACTS_PATH}/${missingId}`)
        .set('Authorization', auth)
        .expect(404);
      expect(deleteMissing.body.message).toBe(FACT_NOT_FOUND);

      const created = await request(app.getHttpServer())
        .post(FACTS_PATH)
        .set('Authorization', auth)
        .send({ text: 'Опыт пять лет' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`${FACTS_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .expect(204);

      const secondDelete = await request(app.getHttpServer())
        .delete(`${FACTS_PATH}/${created.body.id}`)
        .set('Authorization', auth)
        .expect(404);
      expect(secondDelete.body.message).toBe(FACT_NOT_FOUND);
    });

    it('не открывает маршруты без токена', async () => {
      const id = randomUUID();
      const factsBefore = await prisma.confirmedFact.count();

      await request(app.getHttpServer())
        .post(FACTS_PATH)
        .send({ text: 'Опыт пять лет' })
        .expect(401);

      await request(app.getHttpServer())
        .patch(`${FACTS_PATH}/${id}`)
        .send({ text: 'Опыт пять лет' })
        .expect(401);

      await request(app.getHttpServer())
        .delete(`${FACTS_PATH}/${id}`)
        .expect(401);

      expect(await prisma.confirmedFact.count()).toBe(factsBefore);
    });
  });
});
