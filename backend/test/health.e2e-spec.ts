import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import EmbeddedPostgres from 'embedded-postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { EnvConfig } from '../src/common/configurations/env/env.service.js';

const POSTGRES_PORT = 55432;
const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWORD = 'password';
const DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/postgres?schema=public`;

const DATABASE_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  '.tmp',
  'pg-e2e',
  randomUUID(),
);

describe('GET /health (e2e)', () => {
  let app: INestApplication;
  let postgres: EmbeddedPostgres;

  beforeAll(async () => {
    await mkdir(dirname(DATABASE_DIR), { recursive: true });

    postgres = new EmbeddedPostgres({
      databaseDir: DATABASE_DIR,
      port: POSTGRES_PORT,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      persistent: false,
      onLog: () => {},
      onError: (message) => console.error(message),
    });

    await postgres.initialise();
    await postgres.start();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EnvConfig)
      .useValue({ databaseUrl: DATABASE_URL })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 180_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (postgres) {
      await postgres.stop();
    }
  }, 60_000);

  it('отвечает 200, пока база доступна', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('отвечает 503 после остановки базы', async () => {
    await postgres.stop();

    await request(app.getHttpServer())
      .get('/health')
      .expect(503)
      .expect({ status: 'error', database: 'down' });
  });
});
