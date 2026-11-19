import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './repositories/auth.repository.js';
import { TokenModule } from '../token/token.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  imports: [TokenModule],
})
export class AuthModule {}
