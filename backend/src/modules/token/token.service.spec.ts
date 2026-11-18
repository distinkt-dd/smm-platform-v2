import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service.js';
import { JwtService } from '@nestjs/jwt';

describe('TokenService', () => {
  let service: TokenService;

  const jwtService = {
    signAsync: vi.fn()
  }

  beforeEach(async () => {

    jwtService.signAsync.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenService,
        {
          provide: JwtService,
          useValue: jwtService
        }
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('Подписывает данные пользователя и возвращает токен', async () => {
    jwtService.signAsync.mockResolvedValue('test-token');

    const result = await service.generateAccessToken({ id: 'user-123', email: 'user@example.com' });
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'user-123', email: 'user@example.com' });
    expect(result).toBe('test-token');
  })
});
