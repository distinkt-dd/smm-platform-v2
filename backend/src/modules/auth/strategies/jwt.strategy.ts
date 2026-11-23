import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { EnvConfig } from "../../../common/configurations/env/env.service.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import type { Request } from 'express';

function fromCookie(req: Request): string | null {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('access_token='));
  return cookie ? cookie.slice('access_token='.length) || null : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(envConfig: EnvConfig, private readonly authRepository: AuthRepository) {
    super({
        jwtFromRequest: ExtractJwt.fromExtractors([fromCookie, ExtractJwt.fromAuthHeaderAsBearerToken()]),
        ignoreExpiration: false,
        secretOrKey: envConfig.jwtSecret,
    })
  }

  async validate(payload: { sub?: unknown }) {
    if(typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException('Вы не вошли в аккаунт!');
    }
    
    const user = await this.authRepository.findPublicUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Вы не вошли в аккаунт!');
    }

    return user;
  }
}
