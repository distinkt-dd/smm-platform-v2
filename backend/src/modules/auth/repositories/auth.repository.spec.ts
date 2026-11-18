import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthRepository } from './auth.repository.js';

/**
 * Что здесь проверяем.
 *
 * Репозиторий разговаривает с Prisma. Настоящую базу сюда не подключаем:
 * подменяем `PrismaService` объектом с методом `user.create` и проверяем,
 * что именно репозиторий передаёт в базу и как переводит ошибку уникального
 * индекса в понятный 409.
 */

const RELATION_USER = {
  email: 'dmitry@example.com',
  hashPassword: '$argon2id$v=19$m=65536,t=3,p=4$fake-salt$fake-hash',
};

const CREATED_ROW = {
  id: '2f1c6a52-6f9f-4a4e-9b1f-9d1c1e0b8a11',
  email: RELATION_USER.email,
  createdAt: new Date('2026-11-18T10:00:00.000Z'),
};

describe('AuthRepository', () => {
  let repository: AuthRepository;

  const prismaService = {
    user: {
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    prismaService.user.create.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
  });

  it('создаёт пользователя с хешем и возвращает только публичные поля', async () => {
    prismaService.user.create.mockResolvedValue(CREATED_ROW);

    await expect(repository.registerUser(RELATION_USER)).resolves.toEqual(
      CREATED_ROW,
    );

    // В `data` уходит хеш под именем колонки `password`;
    // в `select` перечислены только поля, которые можно отдавать наружу.
    // Если кто-то добавит в select `password: true`, тест это поймает.
    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: {
        email: RELATION_USER.email,
        password: RELATION_USER.hashPassword,
      },
      select: { id: true, email: true, createdAt: true },
    });
  });

  it('превращает нарушение уникальности email (P2002) в ConflictException', async () => {
    prismaService.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        { code: 'P2002', clientVersion: 'test' },
      ),
    );

    await expect(repository.registerUser(RELATION_USER)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('пробрасывает остальные ошибки базы как есть', async () => {
    prismaService.user.create.mockRejectedValue(new Error('boom'));

    await expect(repository.registerUser(RELATION_USER)).rejects.toThrow(
      'boom',
    );
  });
});
