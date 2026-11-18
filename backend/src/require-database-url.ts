export function requireDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl?.trim()) {
    throw new Error('DATABASE_URL is required');
  }
  return databaseUrl;
}
