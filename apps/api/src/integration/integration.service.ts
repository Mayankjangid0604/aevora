import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionEnvironment, IntegrationStatus } from '@prisma/client';
import { SandboxEmailProvider } from './providers/sandbox-email.provider';
import { StructuredLoggerService } from '../logger/structured-logger.service';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface IntegrationResponse {
  success: boolean;
  message?: string;
  referenceId?: string;
}

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sandboxEmail: SandboxEmailProvider,
    private readonly logger: StructuredLoggerService
  ) {}

  async sendEmail(
    companyId: string,
    environment: ExecutionEnvironment,
    payload: EmailPayload,
    actorId?: string,
  ): Promise<IntegrationResponse> {
    // 1. Log attempt
    const auditLog = await this.prisma.integrationAuditLog.create({
      data: {
        companyId,
        action: 'SEND_EMAIL',
        environment,
        status: 'PENDING',
        requestPayload: JSON.parse(JSON.stringify(payload)),
        actorId,
      },
    });

    try {
      // Find configured provider for email
      const provider = await this.prisma.providerIntegration.findFirst({
        where: {
          companyId,
          capabilityType: 'EMAIL',
          environment,
          status: IntegrationStatus.ACTIVE,
        },
      });

      let response: IntegrationResponse;

      if (environment === ExecutionEnvironment.SIMULATION || environment === ExecutionEnvironment.SANDBOX) {
        // M1: Use actual SandboxEmailProvider
        this.logger.log(
          `[${environment}] Delegating email to SandboxEmailProvider`,
          IntegrationService.name,
          { companyId, environment, auditLogId: auditLog.id, action: 'SEND_EMAIL' }
        );
        const result = await this.sandboxEmail.send(payload);
        response = { success: result.success, message: result.message, referenceId: result.referenceId };
      } else {
        if (!provider) {
          throw new Error('NOT_IMPLEMENTED: No active email provider configured for PRODUCTION');
        }
        // In reality, this would invoke the real provider like SendGrid
        // For Phase 22, if we hit production without a real integration, we fail, but if mock is allowed, we mock.
        // As requested: "Every unsupported capability must be explicitly marked NOT_IMPLEMENTED or LIMITED."
        throw new Error('NOT_IMPLEMENTED: Real production email sending is not yet supported');
      }

      await this.prisma.integrationAuditLog.update({
        where: { id: auditLog.id },
        data: {
          status: 'SUCCESS',
          responsePayload: JSON.parse(JSON.stringify(response)),
          integrationId: provider?.id,
        },
      });

      return response;
    } catch (error) {
      await this.prisma.integrationAuditLog.update({
        where: { id: auditLog.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
      throw error;
    }
  }
}
