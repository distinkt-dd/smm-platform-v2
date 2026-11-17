import { ConfigService } from '@nestjs/config';

export function requireDatabaseUrl(config: ConfigService): string {
  const url = config.get<string>('DATABASE_URL');
  if (!url?.trim()) {
    throw new Error('DATABASE_URL is required');
  }
  return url;
}
