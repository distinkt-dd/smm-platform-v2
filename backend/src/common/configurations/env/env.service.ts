import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.validation.js';

@Injectable()
export class EnvConfig {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  get databaseUrl(): string {
    return this.configService.getOrThrow('DATABASE_URL');
  }

  get appPort(): number {
    return this.configService.getOrThrow('PORT');
  }

  get jwtSecret(): string {
    return this.configService.getOrThrow('JWT_SECRET');
  }
}
