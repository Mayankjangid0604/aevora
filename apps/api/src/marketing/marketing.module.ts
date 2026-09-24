import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../logger/logger.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ApprovalModule } from '../approval/approval.module';
import { ProductionModule } from '../production/production.module';
import { MarketingController } from './marketing.controller';
import { MarketingAuditService } from './marketing-audit.service';
import { BrandService } from './brand.service';
import { MarketResearchService } from './market-research.service';
import { MarketingStrategyService } from './marketing-strategy.service';
import { CampaignService } from './campaign.service';
import { ContentService } from './content.service';
import { ContentCalendarService } from './content-calendar.service';
import { MarketingAnalyticsService } from './marketing-analytics.service';
import { BrandConsistencyService } from './brand-consistency.service';
import { MarketingAgentService } from './marketing-agent.service';

@Module({
  imports: [PrismaModule, LoggerModule, AuthorizationModule, ApprovalModule, ProductionModule],
  controllers: [MarketingController],
  providers: [
    MarketingAuditService,
    BrandService,
    MarketResearchService,
    MarketingStrategyService,
    CampaignService,
    ContentService,
    ContentCalendarService,
    MarketingAnalyticsService,
    BrandConsistencyService,
    MarketingAgentService,
  ],
  exports: [
    MarketingAuditService,
    BrandService,
    MarketResearchService,
    MarketingStrategyService,
    CampaignService,
    ContentService,
    ContentCalendarService,
    MarketingAnalyticsService,
    BrandConsistencyService,
    MarketingAgentService,
  ],
})
export class MarketingModule {}
