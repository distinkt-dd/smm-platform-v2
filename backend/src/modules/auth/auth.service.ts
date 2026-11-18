import { Injectable } from '@nestjs/common';
import { RegistrationUserDto } from './dto/registration-user.dto.js';
import { AuthRepository } from './repositories/auth.repository.js';

import * as argon2 from 'argon2';
import { TUserPublic } from '../../common/types/user.js';

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  private async hashingPassword(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  async register(dto: RegistrationUserDto): Promise<TUserPublic> {
    const hashPassword = await this.hashingPassword(dto.password);
    return this.authRepository.registerUser({
      email: dto.email,
      hashPassword,
    });
  }
}
