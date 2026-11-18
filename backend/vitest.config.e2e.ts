import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Выставляет корректные переменные до импорта AppModule: ConfigModule
    // валидирует окружение раньше, чем тесты подменяют EnvConfig.
    setupFiles: ['./test/support/env.ts'],
    // Кластер PostgreSQL инициализируется и останавливается дольше,
    // чем даёт стандартный таймаут хука.
    hookTimeout: 180_000,
    testTimeout: 30_000,
    // Каждый e2e-файл поднимает свой кластер PostgreSQL: параллельный запуск
    // файлов нагружает машину и не даёт воспроизводимого результата.
    fileParallelism: false,
  },
});
