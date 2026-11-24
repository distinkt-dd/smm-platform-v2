import { Injectable } from '@nestjs/common';
import { ConfirmedFact } from '../../../../common/types/confirmed-fact.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CreateFactDto } from '../dto/create-fact.dto.js';
import { UpdateFactDto } from '../dto/update-fact.dto.js';

/**
 * Публичные поля факта: `master_profile_id`, `created_at` и `updated_at`
 * остаются внутри базы.
 */
const FACT_PUBLIC_SELECT = {
  id: true,
  text: true,
};

/**
 * Работа с подтверждёнными фактами в базе. Как и репозиторий услуг, он не
 * бросает HTTP-исключений: результат операции `null` / `false` вызывающий
 * сервис переводит в `404`.
 */
@Injectable()
export class FactRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Возвращает все факты профиля пользователя в порядке создания.
   *
   * Если профиля ещё нет — пустой массив: для клиента список фактов
   * отсутствующего профиля и профиля без фактов одинаков.
   */
  async findFactsByUserId(userId: string): Promise<ConfirmedFact[]> {
    const masterProfileId = await this.getMasterProfileId(userId);

    if (!masterProfileId) {
      return [];
    }

    return this.prismaService.confirmedFact.findMany({
      where: { masterProfileId },
      select: FACT_PUBLIC_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Создаёт факт в профиле пользователя и возвращает его публичные поля.
   *
   * `null` означает, что профиля нет: факт не может существовать без
   * профиля, поэтому репозиторий явно сообщает об этом вместо ошибки
   * внешнего ключа.
   */
  async createFactByUserId(
    userId: string,
    dto: CreateFactDto,
  ): Promise<ConfirmedFact | null> {
    const masterProfileId = await this.getMasterProfileId(userId);

    if (!masterProfileId) {
      return null;
    }

    return this.prismaService.confirmedFact.create({
      data: {
        text: dto.text,
        masterProfileId,
      },
      select: FACT_PUBLIC_SELECT,
    });
  }

  /**
   * Обновляет факт, только если он принадлежит профилю этого пользователя.
   *
   * `where` содержит и `id`, и `master_profile_id`: чужая запись не попадёт
   * в выборку, `updateMany` вернёт `count = 0`, наружу уйдёт `null`. Так
   * проверка владельца и обновление выполняются одним запросом, без окна
   * между отдельной проверкой и записью.
   *
   * `findUnique` после успеха возвращает актуальные поля, потому что
   * `updateMany` отдаёт только количество изменённых строк.
   */
  async updateFactByUserId(
    userId: string,
    factId: string,
    dto: UpdateFactDto,
  ): Promise<ConfirmedFact | null> {
    const masterProfileId = await this.getMasterProfileId(userId);

    if (!masterProfileId) {
      return null;
    }

    const { count } = await this.prismaService.confirmedFact.updateMany({
      where: { id: factId, masterProfileId },
      data: {
        text: dto.text,
      },
    });

    if (count === 0) {
      return null;
    }

    return this.prismaService.confirmedFact.findUnique({
      where: { id: factId },
      select: FACT_PUBLIC_SELECT,
    });
  }

  /**
   * Удаляет факт профиля. `true` — запись удалена, `false` — её нет, она уже
   * удалена или принадлежит другому профилю. Для клиента это один ответ:
   * `404`, не раскрывающий существование записи.
   */
  async deleteFactByUserId(
    userId: string,
    factId: string,
  ): Promise<boolean> {
    const masterProfileId = await this.getMasterProfileId(userId);

    if (!masterProfileId) {
      return false;
    }

    const { count } = await this.prismaService.confirmedFact.deleteMany({
      where: { id: factId, masterProfileId },
    });

    return count > 0;
  }

  /**
   * Переводит `userId` в `masterProfileId`. `userId` уникален, поэтому это
   * один запрос по индексу; `null` значит, что профиля ещё нет.
   *
   * Методы выше принимают `userId`, а не `masterProfileId`: будущему сервису
   * известен только id авторизованного пользователя.
   */
  private async getMasterProfileId(userId: string): Promise<string | null> {
    const profile = await this.prismaService.masterProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    return profile?.id ?? null;
  }
}
