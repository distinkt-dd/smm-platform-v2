import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { EnvModule } from './common/configurations/env/env.module.js';
import { envSchema } from './common/configurations/env/env.validation.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TokenModule } from './modules/token/token.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validationSchema: envSchema,
    }),
    PrismaModule,
    HealthModule,
    EnvModule,
    AuthModule,
    TokenModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
