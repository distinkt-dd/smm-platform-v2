import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { EnvConfig } from '../../common/configurations/env/env.service.js';
import { Prisma, PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, OnModuleInit
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(envConfig: EnvConfig) {
    const pool = new Pool({
      connectionString: envConfig.databaseUrl,
      ssl: false,
      max: 20,
      // Без таймаута запрос к «повисшей» базе ждёт соединения бесконечно:
      // HTTP-запрос не получает ответа, а `pool.end()` при остановке не завершается.
      connectionTimeoutMillis: 5_000,
    });

    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      await this.ping();
      this.logger.log('Database is connected');
    } catch (error) {
      if (this.isDatabaseUnavailable(error)) {
        this.logger.error(
          `Database is unreachable at startup: ${this.describe(error)}. ` +
            `The application will continue to run, but database-dependent features will fail until the connection is restored.`,
        );
        return;
      }

      this.logger.error(
        'Unexpected error during Prisma init',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      await this.pool.end();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error(
        'Error during database disconnection',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Проверяет доступность базы реальным запросом. В режиме driver adapter
   * `$connect` соединение не открывает: пул `pg` подключается лениво, при первом запросе.
   */
  async ping(): Promise<void> {
    await this.$queryRawUnsafe('SELECT 1');
  }

  private isDatabaseUnavailable(error: unknown): boolean {
    // В режиме driver adapter обрыв соединения приходит как known request error
    // с кодом драйвера (`ECONNREFUSED`), а не как initialization error / P1001.
    return (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError
    );
  }

  private describe(error: unknown): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return `${error.name} (${error.code})`;
    }

    if (error instanceof Error) {
      const firstLine = error.message.trim().split('\n')[0];
      return firstLine || error.name;
    }

    return String(error);
  }
}
