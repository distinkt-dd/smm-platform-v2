import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'up' | 'down';
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    try {
      await this.prismaService.ping();
      return { status: 'ok', database: 'up' };
    } catch (error) {
      this.logger.warn(
        'Database health check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
  }
}
