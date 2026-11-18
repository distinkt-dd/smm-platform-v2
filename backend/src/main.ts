import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

import { EnvConfig } from './common/configurations/env/env.service.js';
import { requireDatabaseUrl } from './require-database-url.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const envService = app.get(EnvConfig);
  requireDatabaseUrl(envService.databaseUrl);

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
