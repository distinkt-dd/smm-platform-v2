import { Test, TestingModule } from '@nestjs/testing';
import { TUserPublic } from '../../common/types/user.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/**
 * Что здесь проверяем.
 *
 * Контроллер — очень тонкий слой: принять тело запроса и передать его в сервис.
 * Поэтому сервис заменяем моком, а от контроллера ждём ровно одного: он вызвал
 * `AuthService.register` с тем же объектом и вернул то, что сервис ответил.
 *
 * Проверка кода ответа (201) и маршрута доступа (POST /auth/register) здесь
 * невозможна: это поведение HTTP-слоя, его проверяет e2e-тест.
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

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    register: vi.fn(),
  };

  beforeEach(async () => {
    authService.register.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('передаёт dto в AuthService.register и возвращает его результат', async () => {
    authService.register.mockResolvedValue(CREATED_USER);

    await expect(controller.register(REGISTRATION)).resolves.toEqual(
      CREATED_USER,
    );
    expect(authService.register).toHaveBeenCalledTimes(1);
    expect(authService.register).toHaveBeenCalledWith(REGISTRATION);
  });

  it('не перехватывает ошибки сервиса', async () => {
    // Если сервис упадёт (например, 409 на занятый email), контроллер должен
    // отдать ошибку дальше, а не проглотить её и вернуть пустой ответ.
    authService.register.mockRejectedValue(new Error('boom'));

    await expect(controller.register(REGISTRATION)).rejects.toThrow('boom');
  });
});
