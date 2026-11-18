import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './modules/prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  const prismaService = { user: { count: vi.fn() } };

  beforeEach(async () => {
    prismaService.user.count.mockReset();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns the number of users', async () => {
      prismaService.user.count.mockResolvedValue(2);

      await expect(appController.getHello()).resolves.toBe(2);
    });
  });
});
