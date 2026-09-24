import { Controller, Get } from '@nestjs/common';
import { Public } from './authorization/jwt-auth.guard';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
