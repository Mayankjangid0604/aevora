import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) {}

  @Post('login')
  async login(@Body() body: { actorId: string, credential?: string }) {
    if (!body.actorId) {
      throw new UnauthorizedException('actorId is required');
    }
    return this.authService.login(body.actorId, body.credential);
  }
}
