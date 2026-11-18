import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { EnvConfig } from "../../../common/configurations/env/env.service.js";
import { AuthRepository } from "../repositories/auth.repository.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(envConfig: EnvConfig, private readonly authRepository: AuthRepository) {
    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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