import { Module } from '@nestjs/common';
import { TokenService } from './token.service.js';
import { TokenController } from './token.controller.js';
import {JwtModule} from '@nestjs/jwt'
import { EnvConfig } from '../../common/configurations/env/env.service.js';

@Module({
  controllers: [TokenController],
  providers: [TokenService],
  imports: [
    JwtModule.registerAsync({
      inject: [EnvConfig],
      useFactory: (envConfig: EnvConfig) => ({
        secret: envConfig.jwtSecret,
        signOptions: {
          expiresIn: '1h'
        },
      }),
    })
  ],
  exports: [TokenService]
})
export class TokenModule {}
