import { createServer } from 'node:net';

/**
 * Просит у ОС свободный порт.
 *
 * Фиксированный порт для `embedded-postgres` брать нельзя: на Windows после
 * `stop()` иногда остаётся процесс, который держит порт, и следующий прогон
 * падает с «Address already in use». Свободный порт делает e2e повторяемыми
 * на любой машине.
 */
export async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Не удалось получить свободный порт'));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}
