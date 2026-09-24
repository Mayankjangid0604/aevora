import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { IntegrationModule } from '../integration/integration.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { LeadGenModule } from '../lead-gen/lead-gen.module';
import { ScopeService } from './scope.service';
import { DeliveryAgentWorker } from './delivery-agent.worker';
import { InvoiceAndPaymentService } from './invoice-payment.service';
import { DeliveryController } from './delivery.controller';

@Module({
  imports: [DevicesModule, IntegrationModule, InvoiceModule, LeadGenModule],
  providers: [ScopeService, DeliveryAgentWorker, InvoiceAndPaymentService],
  controllers: [DeliveryController],
  exports: [ScopeService, DeliveryAgentWorker, InvoiceAndPaymentService],
})
export class DeliveryModule {}
