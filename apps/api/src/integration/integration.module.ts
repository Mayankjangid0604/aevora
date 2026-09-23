import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { SandboxEmailProvider } from './providers/sandbox-email.provider';
import { IntegrationController } from './integration.controller';

@Module({
  providers: [IntegrationService, SandboxEmailProvider],
  controllers: [IntegrationController],
  exports: [IntegrationService],
})
export class IntegrationModule {}
