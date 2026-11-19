import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from './types/token.js';

@Injectable()
export class TokenService {

	constructor(private readonly jwtService: JwtService) {
		
	}

	generateAccessToken(payload: TokenPayload): Promise<string> {
		return this.jwtService.signAsync({sub: payload.id, email: payload.email});
	}
}
