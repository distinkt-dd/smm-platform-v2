import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RegistrationUserDto } from './dto/registration-user.dto.js';
import { AuthRepository } from './repositories/auth.repository.js';

import * as argon2 from 'argon2';
import { TUserPublic } from '../../common/types/user.js';
import { LoginUserDto } from './dto/login-user.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  private async hashingPassword(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  async login(dto: LoginUserDto): Promise<TUserPublic> {
    const findUser = await this.authRepository.getExistingUser(dto.email);
    const verifyPassword = await argon2.verify(dto.password, findUser.password);

    if (!verifyPassword) {
      throw new UnauthorizedException('Не правильный email или пароль!');
    }

    return {
      id: findUser.id,
      email: findUser.email,
      createdAt: findUser.createdAt,
    };
  }

  async register(dto: RegistrationUserDto): Promise<TUserPublic> {
    const hashPassword = await this.hashingPassword(dto.password);
    return this.authRepository.registerUser({
      email: dto.email,
      hashPassword,
    });
  }
}
