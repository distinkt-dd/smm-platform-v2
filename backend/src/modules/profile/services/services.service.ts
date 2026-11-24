import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Service } from '../../../common/types/services.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { ServiceRepository } from './repositories/service.repository.js';

/**
 * Прикладной слой услуг профиля. Здесь репозиторий, который сообщает только
 * «нет записи/нет профиля» через `null`/`false`, переводится в HTTP-ответы:
 * наружу уходит `404`, одинаковый для чужой и несуществующей записи.
 */
@Injectable()
export class ServicesService {
  constructor(private readonly serviceRepository: ServiceRepository) {}

  /**
   * Создаёт услугу в профиле пользователя. Если профиля ещё нет, создать
   * услугу не к чему — `404 «Профиль не найден!»`.
   */
  async create(userId: string, dto: CreateServiceDto): Promise<Service> {
    const service = await this.serviceRepository.createServiceByUserId(
      userId,
      dto,
    );

    if (!service) {
      throw new NotFoundException('Профиль не найден!');
    }

    return service;
  }

  /**
   * Изменяет услугу профиля. `null` от репозитория значит, что записи с
   * таким `serviceId` у этого профиля нет (не существует или принадлежит
   * другому пользователю) — отвечаем `404`, не раскрывая, что она есть.
   */
  async update(
    userId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ): Promise<Service> {
    // Пустое тело (`{}` или только неизвестные поля, которые срезал
    // `whitelist`) не содержит изменений: без этой проверки Prisma выполнила
    // бы запись вхолостую и вернула `200` с неизменённой записью. Отвечаем
    // `400` до обращения к базе: изменять нечего — это ошибка клиента, а не
    // отсутствующая запись.
    if (!Object.values(dto).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'Нужно передать хотя бы одно поле для изменения!',
      );
    }

    const service = await this.serviceRepository.updateServiceByUserId(
      userId,
      serviceId,
      dto,
    );

    if (!service) {
      throw new NotFoundException('Услуга не найдена!');
    }

    return service;
  }

  /**
   * Удаляет услугу профиля. `false` от репозитория — записи нет или она
   * чужая, для клиента это тот же `404`, что и при изменении.
   */
  async remove(userId: string, serviceId: string): Promise<void> {
    const isDeleted = await this.serviceRepository.deleteServiceByUserId(
      userId,
      serviceId,
    );

    if (!isDeleted) {
      throw new NotFoundException('Услуга не найдена!');
    }
  }
}
