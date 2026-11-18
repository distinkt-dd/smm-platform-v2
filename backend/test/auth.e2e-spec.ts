import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import EmbeddedPostgres from 'embedded-postgres';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { EnvConfig } from '../src/common/configurations/env/env.service.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';
import { findFreePort } from './support/free-port.js';

/**
 * Что здесь проверяем.
 *
 * E2E-тест поднимает приложение целиком, как в жизни: HTTP-слой, ValidationPipe,
 * сервис, репозиторий и настоящий PostgreSQL (`embedded-postgres` во временном
 * каталоге). Поэтому здесь проверяются вещи, недоступные модульным тестам:
 * код ответа, маршрут, формат тела, глобальная валидация и реальная запись в базу.
 *
 * Схему в временную базу кладём той же миграцией, что и на сервере:
 * `prisma migrate deploy` из каталога backend.
 */

const REGISTER_PATH = '/auth/register';

const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWORD = 'password';

const BACKEND_ROOT = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
);

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
    [join(BACKEND_ROOT, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'],
    {
      cwd: BACKEND_ROOT,
      // dotenv внутри prisma.config.ts не перезапишет уже заданный DATABASE_URL,
      // поэтому миграция уходит именно во временную базу.
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    },
  );
}

describe('POST /auth/register (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let postgres: EmbeddedPostgres;

  // Уникальный email на каждый тест: база одна на весь файл,
  // и повторный email не должен мешать соседним проверкам.
  const uniqueEmail = () => `${randomUUID()}@example.com`;

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
      onLog: () => {},
      onError: (message) => console.error(message),
    });

    await postgres.initialise();
    await postgres.start();
    applyMigrations(databaseUrl);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EnvConfig)
      .useValue({ databaseUrl })
      .compile();

    app = moduleRef.createNestApplication();

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

  it('отвечает 201 и отдаёт пользователя без пароля', async () => {
    const email = uniqueEmail();

    const response = await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send({ email, password: 'password123' })
      .expect(201);

    // Ровно три поля контракта: id, email, createdAt.
    expect(response.body).toEqual({
      id: expect.any(String),
      email,
      createdAt: expect.any(String),
    });
    expect(response.body).not.toHaveProperty('password');

    const stored = await prisma.user.findUnique({ where: { email } });
    if (!stored) {
      throw new Error('Пользователь не сохранён в базе');
    }

    // В базе лежит хеш, из которого восстанавливается исходный пароль.
    expect(stored.password).not.toBe('password123');
    await expect(argon2.verify(stored.password, 'password123')).resolves.toBe(
      true,
    );
  });

  it('отвечает 409 на повторную регистрацию того же email', async () => {
    const email = uniqueEmail();
    const credentials = { email, password: 'password123' };

    await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send(credentials)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send(credentials)
      .expect(409);

    expect(response.body.message).toBe(
      'Пользователь с таким email уже существует!',
    );
    // Второй пользователь не создан.
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it('отвечает 400 на невалидный email и указывает поле', async () => {
    const response = await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send({ email: 'not-an-email', password: 'password123' })
      .expect(400);

    expect(response.body.message).toContain(
      'Email должен быть валидным email адресом!',
    );
  });

  it('отвечает 400 на пароль короче 8 символов и указывает поле', async () => {
    const response = await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send({ email: uniqueEmail(), password: '123' })
      .expect(400);

    expect(response.body.message).toContain(
      'Минимальная длина пароля - 8 символов!',
    );
  });

  it('игнорирует лишние поля благодаря whitelist', async () => {
    const email = uniqueEmail();

    const response = await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send({ email, password: 'password123', role: 'admin' })
      .expect(201);

    // Поле role не попало ни в ответ, ни в данные пользователя.
    expect(Object.keys(response.body).sort()).toEqual([
      'createdAt',
      'email',
      'id',
    ]);
  });

  it('считает один и тот же email занятым независимо от регистра и пробелов', async () => {
    const response = await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send({ email: '  Dmitry@Example.COM ', password: 'password123' })
      .expect(201);

    // В ответе и в базе email уже нормализован.
    expect(response.body.email).toBe('dmitry@example.com');

    await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send({ email: 'dmitry@example.com', password: 'password123' })
      .expect(409);

    expect(await prisma.user.count({ where: { email: 'dmitry@example.com' } })).toBe(1);
  });

  it('на параллельных запросах создаёт одного пользователя, остальные получают 409', async () => {
    const email = uniqueEmail();
    const credentials = { email, password: 'password123' };

    // Шлём пять запросов одновременно: проверка перед вставкой их бы не поймала,
    // уникальный индекс в базе — должен.
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).post(REGISTER_PATH).send(credentials),
      ),
    );

    const statuses = responses.map((response) => response.status).sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });
});
