import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { ConfirmedFact } from '../../../common/types/confirmed-fact.js';
import { TUserPublic } from '../../../common/types/user.js';
import { CreateFactDto } from './dto/create-fact.dto.js';
import { UpdateFactDto } from './dto/update-fact.dto.js';
import { FactsController } from './facts.controller.js';
import { FactsService } from './facts.service.js';

/**
 * Что здесь проверяем.
 *
 * Как и у услуг, контроллер фактов ничего не решает сам: он берёт
 * `req.user.id` из токена, `:id` из пути и тело запроса, а затем вызывает
 * сервис. Сервис замокан, поэтому тест проверяет только эту передачу — и что
 * ошибки сервиса не превращаются в успешный ответ.
 *
 * `204` у удаления задаётся декоратором `@HttpCode`; его метаданные
 * проверяются напрямую, без HTTP-запроса. Маршруты и тела ответов — в
 * `backend/test/profile.e2e-spec.ts`.
 */

const USER_ID = '2f1c6a52-6f9f-4a4e-9b1f-9d1c1e0b8a11';
const FACT_ID = '6d0b4a3e-1f5c-4b8e-9a77-0c2d3e4f5a6b';

const CREATE_DTO: CreateFactDto = {
  text: 'Работаю в индустрии красоты 10 лет',
};

const FACT: ConfirmedFact = {
  id: FACT_ID,
  text: CREATE_DTO.text,
};

// Контроллер читает только `req.user.id`, поэтому остальной `Request` не нужен.
const request = { user: { id: USER_ID } } as Request & { user: TUserPublic };

describe('FactsController', () => {
  let controller: FactsController;

  const factsService = {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    factsService.create.mockReset();
    factsService.update.mockReset();
    factsService.remove.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FactsController],
      providers: [{ provide: FactsService, useValue: factsService }],
    }).compile();

    controller = module.get<FactsController>(FactsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('создаёт факт для авторизованного пользователя', async () => {
    factsService.create.mockResolvedValue(FACT);

    await expect(controller.create(CREATE_DTO, request)).resolves.toEqual(FACT);

    // id профиля берётся из токена, а не из тела: чужой профиль не подставить.
    expect(factsService.create).toHaveBeenCalledWith(USER_ID, CREATE_DTO);
  });

  it('изменяет факт по `:id` от имени авторизованного пользователя', async () => {
    const dto: UpdateFactDto = { text: 'Работаю 12 лет' };
    const updated: ConfirmedFact = { ...FACT, text: 'Работаю 12 лет' };
    factsService.update.mockResolvedValue(updated);

    await expect(controller.update(FACT_ID, dto, request)).resolves.toEqual(
      updated,
    );

    expect(factsService.update).toHaveBeenCalledWith(USER_ID, FACT_ID, dto);
  });

  it('удаляет факт по `:id` и не возвращает тело', async () => {
    factsService.remove.mockResolvedValue(undefined);

    // `204` — это «нет тела»: обработчик обязан ничего не вернуть.
    await expect(controller.remove(FACT_ID, request)).resolves.toBeUndefined();

    expect(factsService.remove).toHaveBeenCalledWith(USER_ID, FACT_ID);
  });

  it('объявляет удаление как 204 No Content', () => {
    // Статус задаёт декоратор `@HttpCode`; Nest читает эти метаданные при
    // регистрации маршрута, поэтому проверять HTTP-запрос не нужно.
    // Функцию берём из дескриптора, чтобы не ссылаться на метод без привязки.
    const handler = Object.getOwnPropertyDescriptor(
      FactsController.prototype,
      'remove',
    )?.value;
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, handler);

    expect(httpCode).toBe(HttpStatus.NO_CONTENT);
  });

  it('не подменяет ошибку сервиса своим ответом', async () => {
    // `404` от сервиса должен уйти клиенту, а не превратиться в успешное
    // удаление с пустым телом.
    factsService.remove.mockRejectedValue(new Error('Факт не найден!'));

    await expect(controller.remove(FACT_ID, request)).rejects.toThrow(
      'Факт не найден!',
    );
  });
});
