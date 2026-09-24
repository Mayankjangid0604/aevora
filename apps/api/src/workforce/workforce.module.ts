import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalModule } from '../approval/approval.module';
import { WorkforceAuditService } from './workforce-audit.service';
import { WorkerProfileService } from './worker-profile.service';
import { HiringService } from './hiring.service';
import { SkillVerificationService } from './skill-verification.service';
import { PerformanceReviewService } from './performance-review.service';
import { CompensationService } from './compensation.service';
import { AIWorkforceService } from './ai-workforce.service';
import { WorkforcePlanningService } from './workforce-planning.service';
import { WorkforceController } from './workforce.controller';

@Module({
  imports: [PrismaModule, ApprovalModule],
  controllers: [WorkforceController],
  providers: [
    WorkforceAuditService,
    WorkerProfileService,
    HiringService,
    SkillVerificationService,
    PerformanceReviewService,
    CompensationService,
    AIWorkforceService,
    WorkforcePlanningService,
  ],
  exports: [
    WorkforceAuditService,
    WorkerProfileService,
    HiringService,
    SkillVerificationService,
    PerformanceReviewService,
    CompensationService,
    AIWorkforceService,
    WorkforcePlanningService,
  ],
})
export class WorkforceModule {}
