/**
 * E2E-тесты поднимают AppModule целиком, поэтому `ConfigModule.forRoot`
 * валидирует окружение ещё до подмены EnvConfig. Даём схеме корректные
 * значения, если их нет в оболочке или backend/.env: реальные параметры
 * подключения тесты задают сами при подмене EnvConfig.
 */
process.env.DATABASE_URL ??=
  'postgresql://postgres:password@127.0.0.1:5432/postgres?schema=public';
process.env.JWT_SECRET ??= 'e2e-jwt-secret-value';
