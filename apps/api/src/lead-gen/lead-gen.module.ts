import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { LeadSearchService } from './lead-search.service';
import { LeadGenService } from './lead-gen.service';
import { LeadGenController } from './lead-gen.controller';

@Module({
  imports: [DevicesModule],
  providers: [LeadSearchService, LeadGenService],
  controllers: [LeadGenController],
  exports: [LeadGenService, LeadSearchService],
})
export class LeadGenModule {}
