import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { IntegrationModule } from '../integration/integration.module';
import { LeadGenModule } from '../lead-gen/lead-gen.module';
import { EmailOutreachService } from './email-outreach.service';
import { PhoneOutreachService } from './phone-outreach.service';
import { DiscoveryService } from './discovery.service';
import { SalesAgentWorker } from './sales-agent.worker';
import { SalesOutreachController } from './sales-outreach.controller';

@Module({
  imports: [DevicesModule, IntegrationModule, LeadGenModule],
  providers: [EmailOutreachService, PhoneOutreachService, DiscoveryService, SalesAgentWorker],
  controllers: [SalesOutreachController],
  exports: [EmailOutreachService, PhoneOutreachService, DiscoveryService, SalesAgentWorker],
})
export class SalesOutreachModule {}
