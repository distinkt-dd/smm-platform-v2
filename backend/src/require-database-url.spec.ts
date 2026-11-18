import { requireDatabaseUrl } from './require-database-url.js';

describe('requireDatabaseUrl', () => {
  it.each([undefined, '', '  '])('rejects a missing or empty URL', (value) => {
    expect(() => requireDatabaseUrl(value)).toThrow('DATABASE_URL is required');
  });

  it('returns a configured URL', () => {
    const url = 'postgresql://localhost/db';

    expect(requireDatabaseUrl(url)).toBe(url);
  });
});
