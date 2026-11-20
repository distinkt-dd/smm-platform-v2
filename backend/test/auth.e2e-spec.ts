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
import { JwtService } from '@nestjs/jwt';
import { corsOptions } from '../src/common/configurations/env/cors.js';

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
const JWT_SECRET = 'test-secret';

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


  it('регистрирует пользователя и выполняет вход', async () => {
    const email = uniqueEmail();
    const credentials = { email, password: 'password123' };

    // Сначала создаём пользователя в тестовой базе.
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    // Затем входим с теми же данными.
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);


    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body).toEqual(registration.body);

    expect(login.body).toEqual({
      accessToken: expect.any(String),
      user: registration.body,
    });
  });

  it.each([
  'http://localhost:5173',
  'http://localhost:8080',
    ])('разрешает запросы от %s', async (origin) => {
      const response = await request(app.getHttpServer())
        .options('/auth/me')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-headers'])
        .toContain('Authorization');
    });

  it('не разрешает браузерный запрос от чужого origin', async () => {
  const response = await request(app.getHttpServer())
    .options('/auth/me')
    .set('Origin', 'http://example.com')
    .set('Access-Control-Request-Method', 'GET')
    .set('Access-Control-Request-Headers', 'authorization');

  expect(response.headers['access-control-allow-origin']).toBeUndefined();
});

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

  it('не открывает /auth/me без токена', async () => {
  await request(app.getHttpServer())
    .get('/auth/me')
    .expect(401);
  });

  it('не открывает /auth/me с неверной подписью', async () => {
    const jwt = new JwtService();

    const email = uniqueEmail();

    const registration = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: 'password123' })
    .expect(201);

    const token = await jwt.signAsync(
      { sub: registration.body.id, email },
      { secret: 'different-test-secret', expiresIn: '1h' },
    );

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    });


  it('не открывает /auth/me с просроченным токеном', async () => {
    const email = uniqueEmail();

    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    const jwt = new JwtService();
    const token = await jwt.signAsync(
      { sub: registration.body.id, email },
      { secret: JWT_SECRET, expiresIn: -60 },
    );

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
  
  it('не выполняет вход с неверным паролем', async () => {
    const email = uniqueEmail();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);

    expect(response.body).not.toHaveProperty('accessToken');
  });

  it('не открывает профиль без токена', async() => {
    await request(app.getHttpServer())
      .get('/me/profile')
      .expect(401)
  })

  it("создаёт профиль текущего пользователя", async() => {
    const credentials = {
      email: uniqueEmail(),
      password: 'password123'
    }

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);
    
    const profile = {
      displayName: 'Анна',
      specialization: 'Парикмахер',
      about: 'Работаю с женскими стрижками'
    }

    const response = await request(app.getHttpServer())
      .put('/me/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send(profile)
      .expect(200)

    expect(response.body).toMatchObject({
      ...profile,
      services: [],
      confirmedFacts: []
    })

    expect(response.body.id).toEqual(expect.any(String))
  })

  // Каждый сценарий получает отдельного пользователя и работает с реальной БД.
  async function registerAndLogin() {
    const credentials = { email: uniqueEmail(), password: 'password123' };
    const registration = await request(app.getHttpServer())
      .post('/auth/register').send(credentials).expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login').send(credentials).expect(200);
    return { userId: registration.body.id as string, token: login.body.accessToken as string };
  }

  const profileData = {
    displayName: 'Анна',
    specialization: 'Парикмахер',
    about: 'Работаю с женскими стрижками',
  };

  it('читает профиль и обновляет существующую запись', async () => {
    const { userId, token } = await registerAndLogin();
    const auth = `Bearer ${token}`;
    await request(app.getHttpServer()).get('/me/profile')
      .set('Authorization', auth).expect(404);
    const created = await request(app.getHttpServer()).put('/me/profile')
      .set('Authorization', auth).send(profileData).expect(200);
    const updatedData = { displayName: 'Анна Петрова', specialization: 'Стилист', about: 'Помогаю подобрать новый образ' };
    const updated = await request(app.getHttpServer()).put('/me/profile')
      .set('Authorization', auth).send(updatedData).expect(200);
    expect(updated.body).toMatchObject({ id: created.body.id, ...updatedData, services: [], confirmedFacts: [] });
    const fetched = await request(app.getHttpServer()).get('/me/profile')
      .set('Authorization', auth).expect(200);
    expect(fetched.body).toMatchObject({ id: created.body.id, ...updatedData, services: [], confirmedFacts: [] });
    expect(await prisma.masterProfile.count({ where: { userId } })).toBe(1);
  });

  it('отклоняет PUT без токена и неверные данные', async () => {
    await request(app.getHttpServer()).put('/me/profile').send(profileData).expect(401);
    const { token } = await registerAndLogin();
    for (const invalid of [
      { specialization: 'Стилист' },
      { ...profileData, displayName: 'А' },
      { ...profileData, specialization: 123 },
    ]) {
      await request(app.getHttpServer()).put('/me/profile')
        .set('Authorization', `Bearer ${token}`).send(invalid).expect(400);
    }
  });

  it('изолирует профили и игнорирует чужой userId в теле', async () => {
    const first = await registerAndLogin();
    const second = await registerAndLogin();
    const secondData = { displayName: 'Мария', specialization: 'Визажист' };
    const secondProfile = await request(app.getHttpServer()).put('/me/profile')
      .set('Authorization', `Bearer ${second.token}`).send(secondData).expect(200);
    const firstProfile = await request(app.getHttpServer()).put('/me/profile')
      .set('Authorization', `Bearer ${first.token}`)
      .send({ ...profileData, userId: second.userId }).expect(200);
    expect(firstProfile.body).toMatchObject(profileData);
    expect(firstProfile.body.id).not.toBe(secondProfile.body.id);
    const firstGet = await request(app.getHttpServer()).get('/me/profile')
      .set('Authorization', `Bearer ${first.token}`).expect(200);
    const secondGet = await request(app.getHttpServer()).get('/me/profile')
      .set('Authorization', `Bearer ${second.token}`).expect(200);
    expect(firstGet.body).toMatchObject({ id: firstProfile.body.id, ...profileData });
    expect(secondGet.body).toMatchObject({ id: secondProfile.body.id, ...secondData });
    expect((await prisma.masterProfile.findUnique({ where: { userId: first.userId } }))?.id).toBe(firstProfile.body.id);
  });

  it('возвращает услуги и факты профиля', async () => {
    const { token } = await registerAndLogin();
    const created = await request(app.getHttpServer()).put('/me/profile')
      .set('Authorization', `Bearer ${token}`).send(profileData).expect(200);
    await prisma.service.create({ data: { masterProfileId: created.body.id, title: 'Стрижка' } });
    await prisma.confirmedFact.create({ data: { masterProfileId: created.body.id, text: 'Опыт работы пять лет' } });
    const fetched = await request(app.getHttpServer()).get('/me/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(fetched.body.services).toEqual([expect.objectContaining({ title: 'Стрижка' })]);
    expect(fetched.body.confirmedFacts).toEqual([expect.objectContaining({ text: 'Опыт работы пять лет' })]);
  });

  it('создаёт один профиль при параллельных первых PUT', async () => {
    const { userId, token } = await registerAndLogin();
    const responses = await Promise.all(Array.from({ length: 10 }, () =>
      request(app.getHttpServer()).put('/me/profile')
        .set('Authorization', `Bearer ${token}`).send(profileData),
    ));
    expect(responses.map((response) => response.status)).toEqual(Array(10).fill(200));
    expect(new Set(responses.map((response) => response.body.id)).size).toBe(1);
    expect(await prisma.masterProfile.count({ where: { userId } })).toBe(1);
  });

});
