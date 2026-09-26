import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { ResponseCacheService } from './response-cache.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DevicesModule } from '../devices/devices.module';
import { SimulationModule } from '../simulation/simulation.module';
import { CeoModule } from '../ceo/ceo.module';
import { VenturesModule } from '../ventures/ventures.module';
import { LeadGenModule } from '../lead-gen/lead-gen.module';
import { IdeasModule } from '../ideas/ideas.module';
import { MarketingContentModule } from '../marketing-content/marketing-content.module';
import { SalesOutreachModule } from '../sales-outreach/sales-outreach.module';

@Module({
  imports: [PrismaModule, DevicesModule, SimulationModule, CeoModule, LeadGenModule, IdeasModule, MarketingContentModule, SalesOutreachModule],
  providers: [AssistantService, ResponseCacheService],
  controllers: [AssistantController],
  exports: [AssistantService, ResponseCacheService],
})
export class AssistantModule {}
