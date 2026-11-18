import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvConfig {
  constructor(private readonly configService: ConfigService) {}

  get databaseUrl(): string | undefined {
    return this.configService.get<string>('DATABASE_URL');
  }

  get appPort(): number | undefined {
    return this.configService.get<number>('PORT');
  }
}
