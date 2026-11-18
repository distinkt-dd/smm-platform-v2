import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;
  const prismaService = { ping: vi.fn() };

  beforeEach(async () => {
    prismaService.ping.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prismaService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('отвечает ok, когда база доступна', async () => {
    prismaService.ping.mockResolvedValue(undefined);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('отвечает 503, когда база недоступна', async () => {
    prismaService.ping.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
