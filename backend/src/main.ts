import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const configService = new ConfigService();
  configService.getOrThrow<string>('DATABASE_URL');

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
