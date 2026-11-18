import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { TUserPublic } from '../../common/types/user.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './repositories/auth.repository.js';

import {TokenService} from '../token/token.service.js';

/**
 * Что здесь проверяем.
 *
 * Тестируем только `AuthService` — его собственную работу: захешировать пароль
 * и вызвать репозиторий. Хеширование настоящее (argon2), а репозиторий — заглушка:
 * в базе данных при таком тесте нужды нет.
 */

const REGISTRATION = {
  email: 'dmitry@example.com',
  password: 'password123',
};

const CREATED_USER: TUserPublic = {
  id: '2f1c6a52-6f9f-4a4e-9b1f-9d1c1e0b8a11',
  email: REGISTRATION.email,
  createdAt: new Date('2026-11-18T10:00:00.000Z'),
};

describe('AuthService', () => {
  let service: AuthService;

  const tokenService = {
    generateAccessToken: vi.fn()
  }

  // Мок репозитория — обычный объект с методом `registerUser`, который
  // возвращает не данные из базы, а то, что мы сами ему велим.
  const authRepository = {
    registerUser: vi.fn(),
    getExistingUser: vi.fn(),
  };

  beforeEach(async () => {
    // Каждый тест начинается с «чистого» мока: иначе вызовы предыдущего теста
    // останутся в его истории и проверки начнут врать.
    authRepository.registerUser.mockReset();
    tokenService.generateAccessToken.mockReset();
    authRepository.getExistingUser.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // Подменяем настоящий AuthRepository на мок по его классу-токену.
        { provide: AuthRepository, useValue: authRepository },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('не выдаёт токен при неверном пароле', async () => {
  const passwordHash = await argon2.hash('другой-пароль');

  authRepository.getExistingUser.mockResolvedValue({
    ...CREATED_USER,
    password: passwordHash,
  });

  await expect(service.login(REGISTRATION)).rejects.toMatchObject({
    status: 401,
    message: 'Не правильный email или пароль!',
  });

  expect(tokenService.generateAccessToken).not.toHaveBeenCalled();
});

  it('Не выдает токен, если пользователь не найден', async () => {
    authRepository.getExistingUser.mockResolvedValue(null);

    await expect(service.login(REGISTRATION)).rejects.toMatchObject({
      status: 401,
      message: 'Не правильный email или пароль!',
    });

    expect(tokenService.generateAccessToken).not.toHaveBeenCalled();
  });

  it('При верном пароле возвращает токен и публичные поля пользователя', async () => {
    const passwordHash = await argon2.hash(REGISTRATION.password);

    authRepository.getExistingUser.mockResolvedValue({
      ...CREATED_USER,
      password: passwordHash,
    })
    tokenService.generateAccessToken.mockResolvedValue('test-token');

    const result = await service.login(REGISTRATION);

    expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
      id: CREATED_USER.id,
      email: CREATED_USER.email,
    });

    expect(result).toEqual({
      accessToken: 'test-token',
      user: CREATED_USER,
    });
  })

  it('сохраняет пользователя и возвращает публичные поля', async () => {
    authRepository.registerUser.mockResolvedValue(CREATED_USER);

    await expect(service.register(REGISTRATION)).resolves.toEqual(CREATED_USER);

    // В репозиторий уходят ровно два поля: email и хеш. Открытого пароля нет.
    expect(authRepository.registerUser).toHaveBeenCalledWith({
      email: REGISTRATION.email,
      hashPassword: expect.any(String),
    });
  });

  it('кладёт в репозиторий хеш argon2, а не открытый пароль', async () => {
    authRepository.registerUser.mockResolvedValue(CREATED_USER);

    await service.register(REGISTRATION);

    // `mock.calls` — история вызовов: [ [аргументы первого вызова], ... ].
    const { hashPassword } = authRepository.registerUser.mock.calls[0][0];

    expect(hashPassword).not.toBe(REGISTRATION.password);
    // Хеш argon2 всегда начинается с $argon2id$ (или $argon2i$ / $argon2d$).
    expect(hashPassword).toMatch(/^\$argon2(id|i|d)\$/);
    // Самая важная проверка: из хеша действительно восстанавливается пароль.
    await expect(
      argon2.verify(hashPassword, REGISTRATION.password),
    ).resolves.toBe(true);
    // И чужой пароль по этому хешу не подходит.
    await expect(argon2.verify(hashPassword, 'другой-пароль')).resolves.toBe(
      false,
    );
  });

  it('хеширует одинаковые пароли по-разному из-за случайной соли', async () => {
    authRepository.registerUser.mockResolvedValue(CREATED_USER);

    await service.register(REGISTRATION);
    await service.register(REGISTRATION);

    const firstHash = authRepository.registerUser.mock.calls[0][0].hashPassword;
    const secondHash =
      authRepository.registerUser.mock.calls[1][0].hashPassword;

    expect(firstHash).not.toBe(secondHash);
  });

  it('пробрасывает ConflictException, когда email уже занят', async () => {
    authRepository.registerUser.mockRejectedValue(
      new ConflictException('Пользователь с таким email уже существует!'),
    );

    await expect(service.register(REGISTRATION)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
