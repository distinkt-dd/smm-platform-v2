import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmedFact } from '../../../common/types/confirmed-fact.js';
import { CreateFactDto } from './dto/create-fact.dto.js';
import { UpdateFactDto } from './dto/update-fact.dto.js';
import { FactsService } from './facts.service.js';
import { FactRepository } from './repositories/fact.repository.js';

/**
 * Что здесь проверяем.
 *
 * `FactsService` устроен как `ServicesService`: репозиторий сообщает отказ
 * через `null` / `false`, а сервис переводит его в `404`. Поэтому базы здесь
 * нет — репозиторий замокан, и проверяется только эта договорённость: аргументы
 * доходят до репозитория без изменений, отказ даёт `404`, пустой `PATCH` — `400`
 * до обращения к базе.
 *
 * Сквозной CRUD фактов по HTTP проверяет `backend/test/profile.e2e-spec.ts`.
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

describe('FactsService', () => {
  let service: FactsService;

  // Мок репозитория: методы возвращают то, что велит им тест.
  const factRepository = {
    createFactByUserId: vi.fn(),
    updateFactByUserId: vi.fn(),
    deleteFactByUserId: vi.fn(),
  };

  beforeEach(async () => {
    // Сбрасываем историю вызовов, иначе проверки `toHaveBeenCalledTimes` и
    // `not.toHaveBeenCalled` увидят вызовы предыдущего теста.
    factRepository.createFactByUserId.mockReset();
    factRepository.updateFactByUserId.mockReset();
    factRepository.deleteFactByUserId.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FactsService,
        // Настоящий репозиторий подменяем моком по его классу-токену.
        { provide: FactRepository, useValue: factRepository },
      ],
    }).compile();

    service = module.get<FactsService>(FactsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('создаёт факт и отдаёт его публичные поля', async () => {
    factRepository.createFactByUserId.mockResolvedValue(FACT);

    await expect(service.create(USER_ID, CREATE_DTO)).resolves.toEqual(FACT);

    expect(factRepository.createFactByUserId).toHaveBeenCalledWith(
      USER_ID,
      CREATE_DTO,
    );
  });

  it('отвечает 404, когда профиля для факта ещё нет', async () => {
    // `null` от репозитория значит «профиля нет»: факту негде храниться.
    factRepository.createFactByUserId.mockResolvedValue(null);

    await expect(service.create(USER_ID, CREATE_DTO)).rejects.toMatchObject({
      status: 404,
      message: 'Профиль не найден!',
    });

    expect(factRepository.createFactByUserId).toHaveBeenCalledTimes(1);
  });

  it('изменяет факт и отдаёт обновлённую запись', async () => {
    const newText = 'Работаю в индустрии красоты 12 лет';
    const dto: UpdateFactDto = { text: newText };
    const updated: ConfirmedFact = { ...FACT, text: newText };
    factRepository.updateFactByUserId.mockResolvedValue(updated);

    await expect(service.update(USER_ID, FACT_ID, dto)).resolves.toEqual(
      updated,
    );

    expect(factRepository.updateFactByUserId).toHaveBeenCalledWith(
      USER_ID,
      FACT_ID,
      dto,
    );
  });

  it('отвечает 404 на отсутствующий факт', async () => {
    factRepository.updateFactByUserId.mockResolvedValue(null);

    await expect(
      service.update(USER_ID, FACT_ID, { text: 'Новый текст факта' }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Факт не найден!',
    });
  });

  it('на чужой `id` отвечает тем же 404, что и на отсутствующий', async () => {
    // Репозиторий ищет запись сразу по `id` и профилю владельца, поэтому чужой
    // факт для него — отсутствующий. Клиент не должен их различать.
    const missing = await service
      .update('чужой-пользователь', FACT_ID, { text: 'Новый текст факта' })
      .catch((error: unknown) => error);
    const foreign = await service
      .update(USER_ID, 'чужой-fact-id', { text: 'Новый текст факта' })
      .catch((error: unknown) => error);

    expect(missing).toBeInstanceOf(NotFoundException);
    expect(foreign).toBeInstanceOf(NotFoundException);
    expect((missing as NotFoundException).message).toBe(
      (foreign as NotFoundException).message,
    );
  });

  it('на пустой `PATCH` отвечает 400 и не трогает базу', async () => {
    // После `whitelist` тело из одних неизвестных полей выглядит как `{}`.
    await expect(service.update(USER_ID, FACT_ID, {})).rejects.toMatchObject({
      status: 400,
      message: 'Нужно передать хотя бы одно поле для изменения!',
    });

    expect(factRepository.updateFactByUserId).not.toHaveBeenCalled();
  });

  it('на `PATCH` только с `undefined` отвечает 400', async () => {
    // `text` — обязательная колонка, поэтому `undefined` не изменение:
    // без проверки Prisma записала бы строку вхолостую и вернула `200`.
    await expect(
      service.update(USER_ID, FACT_ID, { text: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(factRepository.updateFactByUserId).not.toHaveBeenCalled();
  });

  it('удаляет факт своего профиля', async () => {
    factRepository.deleteFactByUserId.mockResolvedValue(true);

    await expect(service.remove(USER_ID, FACT_ID)).resolves.toBeUndefined();

    expect(factRepository.deleteFactByUserId).toHaveBeenCalledWith(
      USER_ID,
      FACT_ID,
    );
  });

  it('отвечает 404, когда удалять нечего', async () => {
    factRepository.deleteFactByUserId.mockResolvedValue(false);

    await expect(service.remove(USER_ID, FACT_ID)).rejects.toMatchObject({
      status: 404,
      message: 'Факт не найден!',
    });
  });
});
