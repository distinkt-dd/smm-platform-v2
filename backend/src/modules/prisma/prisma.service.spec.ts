import { Test, TestingModule } from '@nestjs/testing';
import { EnvConfig } from '../../common/configurations/env/env.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

const DATABASE_URL =
  'postgresql://postgres:password@localhost:5433/db_name?schema=public';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: EnvConfig, useValue: { databaseUrl: DATABASE_URL } },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('проверяет доступность базы запросом, а не только $connect', async () => {
    vi.spyOn(service, '$connect').mockResolvedValue();
    const querySpy = vi
      .spyOn(service, '$queryRawUnsafe')
      .mockResolvedValue([{ '?column?': 1 }]);

    await service.onModuleInit();

    expect(querySpy).toHaveBeenCalledWith('SELECT 1');
  });

  it('не падает на старте, когда база недоступна', async () => {
    vi.spyOn(service, '$connect').mockResolvedValue();
    vi.spyOn(service, '$queryRawUnsafe').mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        '\nInvalid `prisma.$queryRawUnsafe()` invocation:\n\n',
        { code: 'ECONNREFUSED', clientVersion: 'test' },
      ),
    );

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('пробрасывает неожиданные ошибки инициализации', async () => {
    vi.spyOn(service, '$connect').mockRejectedValue(new Error('boom'));

    await expect(service.onModuleInit()).rejects.toThrow('boom');
  });
});
