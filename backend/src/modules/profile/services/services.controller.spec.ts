import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { Service } from '../../../common/types/services.js';
import { TUserPublic } from '../../../common/types/user.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

/**
 * Что здесь проверяем.
 *
 * Контроллер — тонкий слой: взять `req.user.id`, тело и `:id`, вызвать сервис и
 * вернуть его результат. Поэтому сервис заменён моком, а от контроллера ждём
 * ровно этого: id берётся из авторизованного пользователя, а не из тела или
 * параметров, аргументы уходят в сервис без изменений.
 *
 * Отдельно проверяется `204` у удаления: статус задаёт декоратор `@HttpCode`,
 * и его метаданные доступны без HTTP-запроса. Сами маршруты и тела ответов
 * проверяет `backend/test/profile.e2e-spec.ts`.
 */

const USER_ID = '2f1c6a52-6f9f-4a4e-9b1f-9d1c1e0b8a11';
const SERVICE_ID = '6d0b4a3e-1f5c-4b8e-9a77-0c2d3e4f5a6b';

const CREATE_DTO: CreateServiceDto = {
  title: 'Стрижка',
  description: 'Мужская стрижка машинкой',
};

const SERVICE: Service = {
  id: SERVICE_ID,
  title: CREATE_DTO.title,
  description: 'Мужская стрижка машинкой',
};

// Запрос в тесте — только та часть, которую читает контроллер. Приведение
// безопасности ради: полный `Request` Express здесь не нужен.
const request = { user: { id: USER_ID } } as Request & { user: TUserPublic };

describe('ServicesController', () => {
  let controller: ServicesController;

  const servicesService = {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    servicesService.create.mockReset();
    servicesService.update.mockReset();
    servicesService.remove.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [{ provide: ServicesService, useValue: servicesService }],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('создаёт услугу для авторизованного пользователя', async () => {
    servicesService.create.mockResolvedValue(SERVICE);

    await expect(controller.create(CREATE_DTO, request)).resolves.toEqual(
      SERVICE,
    );

    // Первый аргумент — id из токена, а не из тела: подставить чужой профиль
    // через тело запроса нельзя.
    expect(servicesService.create).toHaveBeenCalledWith(USER_ID, CREATE_DTO);
  });

  it('изменяет услугу по `:id` от имени авторизованного пользователя', async () => {
    const dto: UpdateServiceDto = { title: 'Стрижка бороды' };
    const updated: Service = { ...SERVICE, title: 'Стрижка бороды' };
    servicesService.update.mockResolvedValue(updated);

    await expect(controller.update(SERVICE_ID, dto, request)).resolves.toEqual(
      updated,
    );

    expect(servicesService.update).toHaveBeenCalledWith(
      USER_ID,
      SERVICE_ID,
      dto,
    );
  });

  it('удаляет услугу по `:id` и не возвращает тело', async () => {
    servicesService.remove.mockResolvedValue(undefined);

    // `204` — это «нет тела»: обработчик обязан ничего не вернуть, иначе
    // Express отправит `200` с пустым JSON.
    await expect(
      controller.remove(SERVICE_ID, request),
    ).resolves.toBeUndefined();

    expect(servicesService.remove).toHaveBeenCalledWith(USER_ID, SERVICE_ID);
  });

  it('объявляет удаление как 204 No Content', () => {
    // Статус задаётся декоратором `@HttpCode`, а не телом ответа: проверяем
    // метаданные метода, которые читает Nest при регистрации маршрута.
    // Функцию берём из дескриптора, чтобы не ссылаться на метод без привязки.
    const handler = Object.getOwnPropertyDescriptor(
      ServicesController.prototype,
      'remove',
    )?.value;
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, handler);

    expect(httpCode).toBe(HttpStatus.NO_CONTENT);
  });

  it('не подменяет ошибку сервиса своим ответом', async () => {
    // Если сервис бросил `404`, контроллер должен пропустить исключение
    // дальше, а не вернуть `undefined` как успешное удаление.
    servicesService.remove.mockRejectedValue(new Error('Услуга не найдена!'));

    await expect(controller.remove(SERVICE_ID, request)).rejects.toThrow(
      'Услуга не найдена!',
    );
  });
});
