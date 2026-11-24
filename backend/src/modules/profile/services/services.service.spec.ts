import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Service } from '../../../common/types/services.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { ServiceRepository } from './repositories/service.repository.js';
import { ServicesService } from './services.service.js';

/**
 * Что здесь проверяем.
 *
 * `ServicesService` — единственное место, где отказ репозитория (`null` /
 * `false`) превращается в HTTP-ответ. Поэтому репозиторий заменён моком: база
 * и Docker этому тесту не нужны, а проверить нужно ровно три вещи — сервис
 * передаёт аргументы в репозиторий без изменений, отказ репозитория даёт `404`,
 * а пустой `PATCH` отсекается `400` ещё до обращения к базе.
 *
 * Коды ответов `201`/`200`/`204` и сами маршруты — поведение HTTP-слоя, его
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

describe('ServicesService', () => {
  let service: ServicesService;

  // Мок репозитория — обычный объект с методами. Он возвращает не данные из
  // базы, а то, что мы сами ему велим в каждом тесте.
  const serviceRepository = {
    createServiceByUserId: vi.fn(),
    updateServiceByUserId: vi.fn(),
    deleteServiceByUserId: vi.fn(),
  };

  beforeEach(async () => {
    // Каждый тест начинается с «чистого» мока: иначе вызовы предыдущего теста
    // останутся в истории и проверки начнут врать.
    serviceRepository.createServiceByUserId.mockReset();
    serviceRepository.updateServiceByUserId.mockReset();
    serviceRepository.deleteServiceByUserId.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        // Подменяем настоящий репозиторий на мок по его классу-токену.
        { provide: ServiceRepository, useValue: serviceRepository },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('создаёт услугу и отдаёт её публичные поля', async () => {
    serviceRepository.createServiceByUserId.mockResolvedValue(SERVICE);

    await expect(service.create(USER_ID, CREATE_DTO)).resolves.toEqual(SERVICE);

    // В репозиторий уходят id авторизованного пользователя и тело как есть:
    // сервис ничего не подставляет и не переименовывает.
    expect(serviceRepository.createServiceByUserId).toHaveBeenCalledWith(
      USER_ID,
      CREATE_DTO,
    );
  });

  it('отвечает 404, когда профиля для услуги ещё нет', async () => {
    // `null` от репозитория значит «профиля нет»: услугу не к чему привязать.
    serviceRepository.createServiceByUserId.mockResolvedValue(null);

    await expect(service.create(USER_ID, CREATE_DTO)).rejects.toMatchObject({
      status: 404,
      message: 'Профиль не найден!',
    });

    expect(serviceRepository.createServiceByUserId).toHaveBeenCalledTimes(1);
  });

  it('изменяет услугу и отдаёт обновлённую запись', async () => {
    const dto: UpdateServiceDto = { title: 'Стрижка бороды' };
    const updated: Service = { ...SERVICE, title: 'Стрижка бороды' };
    serviceRepository.updateServiceByUserId.mockResolvedValue(updated);

    await expect(service.update(USER_ID, SERVICE_ID, dto)).resolves.toEqual(
      updated,
    );

    expect(serviceRepository.updateServiceByUserId).toHaveBeenCalledWith(
      USER_ID,
      SERVICE_ID,
      dto,
    );
  });

  it('очищает необязательное описание через `description: null`', async () => {
    // `null` — это изменение, а не «поле не передали»: так клиент убирает
    // описание. Отсекать его проверкой ниже нельзя.
    const dto: UpdateServiceDto = { description: null };
    serviceRepository.updateServiceByUserId.mockResolvedValue({
      ...SERVICE,
      description: null,
    });

    await expect(service.update(USER_ID, SERVICE_ID, dto)).resolves.toEqual({
      ...SERVICE,
      description: null,
    });
  });

  it('отвечает 404 на отсутствующую услугу', async () => {
    serviceRepository.updateServiceByUserId.mockResolvedValue(null);

    await expect(
      service.update(USER_ID, SERVICE_ID, { title: 'Стрижка бороды' }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Услуга не найдена!',
    });
  });

  it('на чужой `id` отвечает тем же 404, что и на отсутствующий', async () => {
    // Репозиторий ищет запись сразу по `id` и профилю владельца, поэтому чужая
    // услуга для него — это отсутствующая. Клиент не должен отличать эти
    // случаи: текст и статус ответа одинаковые.
    const missing = await service
      .update('чужой-пользователь', SERVICE_ID, { title: 'Стрижка бороды' })
      .catch((error: unknown) => error);
    const foreign = await service
      .update(USER_ID, 'чужой-service-id', { title: 'Стрижка бороды' })
      .catch((error: unknown) => error);

    expect(missing).toBeInstanceOf(NotFoundException);
    expect(foreign).toBeInstanceOf(NotFoundException);
    expect((missing as NotFoundException).message).toBe(
      (foreign as NotFoundException).message,
    );
  });

  it('на пустой `PATCH` отвечает 400 и не трогает базу', async () => {
    // После `whitelist` тело из одних неизвестных полей выглядит как `{}`.
    await expect(service.update(USER_ID, SERVICE_ID, {})).rejects.toMatchObject(
      {
        status: 400,
        message: 'Нужно передать хотя бы одно поле для изменения!',
      },
    );

    // Изменять нечего — это ошибка клиента, а не повод сходить в базу.
    expect(serviceRepository.updateServiceByUserId).not.toHaveBeenCalled();
  });

  it('на `PATCH` только с `undefined` отвечает 400', async () => {
    // `JSON` не умеет `undefined`, но такой объект прилетит из внутреннего
    // вызова или теста: полей с настоящим значением в нём нет.
    await expect(
      service.update(USER_ID, SERVICE_ID, { title: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(serviceRepository.updateServiceByUserId).not.toHaveBeenCalled();
  });

  it('удаляет услугу своего профиля', async () => {
    serviceRepository.deleteServiceByUserId.mockResolvedValue(true);

    await expect(service.remove(USER_ID, SERVICE_ID)).resolves.toBeUndefined();

    expect(serviceRepository.deleteServiceByUserId).toHaveBeenCalledWith(
      USER_ID,
      SERVICE_ID,
    );
  });

  it('отвечает 404, когда удалять нечего', async () => {
    serviceRepository.deleteServiceByUserId.mockResolvedValue(false);

    await expect(service.remove(USER_ID, SERVICE_ID)).rejects.toMatchObject({
      status: 404,
      message: 'Услуга не найдена!',
    });
  });
});
