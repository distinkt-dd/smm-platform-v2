import { Injectable } from '@nestjs/common';
import { Service } from '../../../../common/types/services.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CreateServiceDto } from '../dto/create-service.dto.js';
import { UpdateServiceDto } from '../dto/update-service.dto.js';

/**
 * Наружу отдаём только эти поля. В таблице `services` есть ещё
 * `master_profile_id`, `created_at` и `updated_at`, но клиенту они не нужны,
 * а `master_profile_id` — внутренняя связь.
 */
const SERVICE_PUBLIC_SELECT = {
  id: true,
  title: true,
  description: true,
};

/**
 * Работа с услугой в базе. Репозиторий не бросает HTTP-исключений: он только
 * сообщает результат (`null` / `false`), а вызывающий сервис превращает это
 * в `404`. Так слой хранения не зависит от Nest-исключений.
 */
@Injectable()
export class ServiceRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Возвращает все услуги профиля пользователя в порядке создания.
   *
   * Если профиля ещё нет — пустой массив: список пустого профиля и
   * отсутствующий профиль для клиента выглядят одинаково (`[]`), а сам
   * профиль создаётся отдельным `PUT /me/profile`.
   */
  async findServicesByUserId(userId: string): Promise<Service[]> {
    const masterProfileId = await this.getMasterProfileId(userId);

    if (!masterProfileId) {
      return [];
    }

    return this.prismaService.service.findMany({
      where: { masterProfileId },
      select: SERVICE_PUBLIC_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Создаёт услугу в профиле пользователя и возвращает её публичные поля.
   *
   * `null` означает, что профиля нет. Услуга не может существовать без
   * профиля, поэтому вместо ошибки внешнего ключа репозиторий явно сообщает
   * об этом вызывающему слою.
   */
  async createServiceByUserId(
    userId: string,
    dto: CreateServiceDto,
  ): Promise<Service | null> {
    const masterProfileId = await this.getMasterProfileId(userId);

    if (!masterProfileId) {
      return null;
    }

    return this.prismaService.service.create({
      data: {
        title: dto.title,
        description: dto.description,
        masterProfileId,
      },
      select: SERVICE_PUBLIC_SELECT,
    });
  }

  /**
   * Обновляет услугу, только если она принадлежит профилю этого пользователя.
   *
   * Проверка владельца встроена в `where`: `updateMany` ищет запись сразу по
   * `id` и `master_profile_id`, поэтому чужая услуга не попадёт в выборку,
   * вернётся `count = 0`, а наружу уйдёт `null`. Отдельный `SELECT` перед
   * изменением не нужен и не оставляет окно между проверкой и записью.
   *
   * `findUnique` после успешного обновления нужен, чтобы вернуть актуальные
   * поля записи: `updateMany` возвращает только количество строк.
   */
  async updateServiceByUserId(
    userId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ): Promise<Service | null> {
    const masterProfileId = await this.getMasterProfileId(userId);

    if (!masterProfileId) {
      return null;
    }

    const { count } = await this.prismaService.service.updateMany({
      where: { id: serviceId, masterProfileId },
      data: {
        title: dto.title,
        description: dto.description,
      },
    });

    if (count === 0) {
      return null;
    }

    return this.prismaService.service.findUnique({
      where: { id: serviceId },
      select: SERVICE_PUBLIC_SELECT,
    });
  }

  /**
   * Удаляет услугу профиля. `true` — запись удалена, `false` — её нет,
   * она уже удалена или принадлежит другому профилю. Для клиента все эти
   * случаи одинаковы: `404`, который не раскрывает существование записи.
   */
  async deleteServiceByUserId(
    userId: string,
    serviceId: string,
  ): Promise<boolean> {
    const masterProfileId = await this.getMasterProfileId(userId);

    if (!masterProfileId) {
      return false;
    }

    const { count } = await this.prismaService.service.deleteMany({
      where: { id: serviceId, masterProfileId },
    });

    return count > 0;
  }

  /**
   * Переводит `userId` в `masterProfileId`. `userId` уникален, поэтому это
   * один запрос по индексу; результат `null` значит, что профиля нет.
   *
   * Все методы выше работают с `userId`, а не с `masterProfileId`: вызывающий
   * код (будущий сервис профиля) знает только авторизованного пользователя,
   * а не внутренний id профиля.
   */
  private async getMasterProfileId(userId: string): Promise<string | null> {
    const profile = await this.prismaService.masterProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    return profile?.id ?? null;
  }
}
