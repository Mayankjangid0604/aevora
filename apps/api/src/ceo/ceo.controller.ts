import { Body, Controller, Get, NotFoundException, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../authorization/jwt-auth.guard';
import { RolesGuard } from '../authorization/roles.guard';
import { Roles } from '../authorization/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CeoReviewService, findCeo } from './ceo-review.service';
import { WeeklyReportService } from './weekly-report.service';
import { CeoDialogueService } from './ceo-dialogue.service';

@Controller('ceo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CeoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: CeoReviewService,
    private readonly weekly: WeeklyReportService,
    private readonly dialogue: CeoDialogueService,
  ) {}

  @Get('reviews')
  list(@Request() req) {
    return this.reviews.list(req.user.companyId);
  }

  /** Last 20 things the CEO did: review summaries, autonomous decisions, follow-ups, script changes, weekly reports. */
  @Get('feed')
  feed(@Request() req) {
    return this.reviews.feed(req.user.companyId, 20);
  }

  @Get('questions')
  questions(@Request() req, @Query('status') status?: string) {
    const s = ['OPEN', 'ANSWERED', 'USED', 'EXPIRED'].includes(status ?? '') ? (status as any) : undefined;
    return this.dialogue.list(req.user.companyId, s);
  }

  @Post('questions/:id/answer')
  @Roles('CHAIRMAN')
  answer(@Request() req, @Param('id') id: string, @Body() body: { answer: string }) {
    return this.dialogue.answer(req.user.companyId, id, body.answer);
  }

  /** Chairman asks the CEO anything; answered immediately. */
  @Post('ask')
  @Roles('CHAIRMAN')
  ask(@Request() req, @Body() body: { question: string }) {
    return this.reviews.answerChairman(req.user.companyId, body.question);
  }

  @Get('weekly-reports')
  weeklyReports(@Request() req) {
    return this.weekly.list(req.user.companyId, 4);
  }

  /** Chairman wants last week's report now (idempotent per week). */
  @Post('weekly-reports/run')
  @Roles('CHAIRMAN')
  async runWeekly(@Request() req) {
    const ceo = await findCeo(this.prisma, req.user.companyId);
    if (!ceo) throw new NotFoundException('No active CEO employee (role title containing "CEO")');
    const state = await this.prisma.simulationState.findFirst({ where: { companyId: req.user.companyId } });
    return this.weekly.generateAndSend(req.user.companyId, ceo.id, state?.simulationTime ?? new Date());
  }

  /** Chairman asks for a review right now (ignores the hourly schedule, still one per sim hour). */
  @Post('reviews/run')
  @Roles('CHAIRMAN')
  async run(@Request() req) {
    const ceo = await findCeo(this.prisma, req.user.companyId);
    if (!ceo) throw new NotFoundException('No active CEO employee (role title containing "CEO")');
    const state = await this.prisma.simulationState.findFirst({ where: { companyId: req.user.companyId } });
    return this.reviews.runReview(req.user.companyId, ceo.id, state?.simulationTime ?? new Date());
  }
}
