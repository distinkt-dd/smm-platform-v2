import { ConflictException, Injectable } from '@nestjs/common';
import { TUserForRelation, TUserPublic } from '../../../common/types/user.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async registerUser(relationUser: TUserForRelation): Promise<TUserPublic> {
    try {
      // Занятость email проверяет уникальный индекс в PostgreSQL, а не
      // предварительный SELECT: между проверкой и вставкой два параллельных
      // запроса успевали пройти проверку оба, и второй падал с 500 (P2002).
      return await this.prismaService.user.create({
        data: {
          email: relationUser.email,
          password: relationUser.hashPassword,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Пользователь с таким email уже существует!');
      }

      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
