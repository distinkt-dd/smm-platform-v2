import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfirmedFact } from '../../../common/types/confirmed-fact.js';
import { CreateFactDto } from './dto/create-fact.dto.js';
import { UpdateFactDto } from './dto/update-fact.dto.js';
import { FactRepository } from './repositories/fact.repository.js';

/**
 * Прикладной слой подтверждённых фактов профиля. Как и `ServicesService`,
 * переводит результат репозитория (`null`/`false`) в `404`: клиент не должен
 * отличать чужую запись от несуществующей.
 */
@Injectable()
export class FactsService {
  constructor(private readonly factRepository: FactRepository) {}

  /**
   * Создаёт факт в профиле пользователя. Без профиля факту негде храниться —
   * `404 «Профиль не найден!»`.
   */
  async create(userId: string, dto: CreateFactDto): Promise<ConfirmedFact> {
    const fact = await this.factRepository.createFactByUserId(userId, dto);

    if (!fact) {
      throw new NotFoundException('Профиль не найден!');
    }

    return fact;
  }

  /**
   * Изменяет факт профиля. `null` значит, что такого `factId` у профиля нет
   * (или он чужой) — `404 «Факт не найден!»`.
   */
  async update(
    userId: string,
    factId: string,
    dto: UpdateFactDto,
  ): Promise<ConfirmedFact> {
    // Пустое тело (`{}` или только неизвестные поля, срезанные `whitelist`)
    // не содержит изменений. Без проверки Prisma обновила бы строку вхолостую
    // и вернула `200`; отвечаем `400`, потому что это ошибка клиента.
    if (!Object.values(dto).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'Нужно передать хотя бы одно поле для изменения!',
      );
    }

    const fact = await this.factRepository.updateFactByUserId(
      userId,
      factId,
      dto,
    );

    if (!fact) {
      throw new NotFoundException('Факт не найден!');
    }

    return fact;
  }

  /**
   * Удаляет факт профиля. `false` — записи нет или она чужая, ответ тот же
   * `404 «Факт не найден!»`.
   */
  async remove(userId: string, factId: string): Promise<void> {
    const isDeleted = await this.factRepository.deleteFactByUserId(
      userId,
      factId,
    );

    if (!isDeleted) {
      throw new NotFoundException('Факт не найден!');
    }
  }
}
