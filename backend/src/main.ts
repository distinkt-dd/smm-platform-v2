import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

import { ValidationPipe } from '@nestjs/common';
import { EnvConfig } from './common/configurations/env/env.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const envService = app.get(EnvConfig);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(envService.appPort);
}
await bootstrap();
