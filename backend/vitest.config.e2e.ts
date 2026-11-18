import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Кластер PostgreSQL инициализируется и останавливается дольше,
    // чем даёт стандартный таймаут хука.
    hookTimeout: 180_000,
    testTimeout: 30_000,
    // Кластер слушает фиксированный порт; при появлении других
    // сквозных тестов их нельзя запускать параллельно.
    fileParallelism: false,
  },
});
