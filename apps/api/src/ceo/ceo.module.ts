import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { TaskModule } from '../task/task.module';
import { VenturesModule } from '../ventures/ventures.module';
import { LeadGenModule } from '../lead-gen/lead-gen.module';
import { SalesOutreachModule } from '../sales-outreach/sales-outreach.module';
import { IntegrationModule } from '../integration/integration.module';
import { IdeasModule } from '../ideas/ideas.module';
import { PipelineManagementService } from './pipeline-management.service';
import { WeeklyReportService } from './weekly-report.service';
import { SelfImprovementService } from './self-improvement.service';
import { CeoDialogueService } from './ceo-dialogue.service';
import { CeoReviewService } from './ceo-review.service';
import { CeoDecisionsService } from './ceo-decisions.service';
import { CeoController } from './ceo.controller';

@Module({
  imports: [DevicesModule, TaskModule, VenturesModule, LeadGenModule, SalesOutreachModule, IntegrationModule, IdeasModule],
  providers: [CeoReviewService, CeoDecisionsService, PipelineManagementService, WeeklyReportService, SelfImprovementService, CeoDialogueService],
  controllers: [CeoController],
  exports: [CeoReviewService, CeoDecisionsService],
})
export class CeoModule {}
