import { BadRequestException, Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../authorization/jwt-auth.guard';
import { RolesGuard } from '../authorization/roles.guard';
import { Roles } from '../authorization/roles.decorator';
import { AssistantService } from './assistant.service';

/** The Chairman's personal assistant — it can command the whole company, so it is Chairman-only. */
@Controller('assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CHAIRMAN')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('message')
  message(@Body() body: { message: string }, @Request() req) {
    const message = body?.message?.trim();
    if (!message) throw new BadRequestException('message is required');
    if (message.length > 2000) throw new BadRequestException('message too long (max 2000 characters)');
    return this.assistant.processMessage(message, req.user.companyId);
  }

  @Get('messages')
  messages(@Request() req) {
    return this.assistant.getRecentMessages(req.user.companyId);
  }

  @Get('pc-tasks')
  pcTasks(@Request() req) {
    return this.assistant.getPendingPcTasks(req.user.companyId);
  }
}
