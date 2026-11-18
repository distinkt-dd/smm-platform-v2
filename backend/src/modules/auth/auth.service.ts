import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RegistrationUserDto } from './dto/registration-user.dto.js';
import { AuthRepository } from './repositories/auth.repository.js';

import * as argon2 from 'argon2';
import { TUserPublic, TUserResponse } from '../../common/types/user.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { TokenService } from '../token/token.service.js';

const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$4dwo6uFzCwmYKlkvaVa+Ig$rw9e+AZ3gh1HrwAJVi4s0b1MWwE15JDdWE/O96sB/gc'

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository, private readonly tokenService: TokenService) {}

  private async hashingPassword(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  async login(dto: LoginUserDto): Promise<TUserResponse> {
    const findUser = await this.authRepository.getExistingUser(dto.email);

    const passwordHash = findUser?.password ?? DUMMY_PASSWORD_HASH;
    
    const isPasswordValid = await argon2.verify(passwordHash, dto.password);

    if (!findUser || !isPasswordValid) {
      throw new UnauthorizedException('Не правильный email или пароль!');
    }

    const accessToken = await this.tokenService.generateAccessToken({ id: findUser.id, email: findUser.email });

    return {
      accessToken,
      user: {
        id: findUser.id,
        email: findUser.email,
        createdAt: findUser.createdAt,
      }
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
