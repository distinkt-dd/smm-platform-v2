import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('test for the absence of DATABSE_URL', () => {
    const configService = app.get(ConfigService);
    delete process.env.DATABASE_URL;

    expect(() => configService.getOrThrow<string>('DATABASE_URL')).toThrow(
      TypeError,
    );

    expect(() => configService.getOrThrow<string>('DATABASE_URL')).toThrow(
      'Configuration key "DATABASE_URL" does not exist',
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
