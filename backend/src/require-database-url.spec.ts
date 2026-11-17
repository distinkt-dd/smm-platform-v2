import { ConfigService } from '@nestjs/config';
import { requireDatabaseUrl } from './require-database-url.js';

describe('requireDatabaseUrl', () => {
  it.each([undefined, '', '  '])('rejects a missing or empty URL', (value) => {
    const config = { get: () => value } as unknown as ConfigService;
    expect(() => requireDatabaseUrl(config)).toThrow('DATABASE_URL is required');
  });

  it('returns a configured URL', () => {
    const config = { get: () => 'postgresql://localhost/db' } as unknown as ConfigService;
    expect(requireDatabaseUrl(config)).toBe('postgresql://localhost/db');
  });
});
