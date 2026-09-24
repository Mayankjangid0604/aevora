import { Injectable, Logger } from '@nestjs/common';
import { ExecutionEnvironment, OutreachChannel, Prisma, SalesLead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationService } from '../integration/integration.service';

export const DEFAULT_EMAIL_SCRIPT = {
  templateName: 'default-email-intro',
  subjectTemplate: 'Quick idea for {{businessName}}',
  bodyTemplate: `Namaste {{businessName}} team,

I'm {{chairmanName}} from {{companyName}}. We help local {{category}} businesses get more customers online — a simple website, Google profile setup, and WhatsApp auto-replies.

Would you be open to a free sample of what this could look like for {{businessName}}? Just reply "yes" and we'll send it over within a couple of days.

Regards,
{{chairmanName}}
{{companyName}}`,
};

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

export function templateVars(lead: Pick<SalesLead, 'name' | 'industry'>): Record<string, string> {
  return {
    businessName: lead.name,
    category: lead.industry ?? 'local',
    chairmanName: process.env.CHAIRMAN_NAME ?? 'The Founder',
    companyName: process.env.COMPANY_NAME ?? 'AEVORA',
  };
}

export function outreachEnv(): ExecutionEnvironment {
  return ExecutionEnvironment[process.env.OUTREACH_ENVIRONMENT as ExecutionEnvironment] ?? ExecutionEnvironment.SANDBOX;
}

export async function isKilled(prisma: PrismaService, companyId: string, features: string[]) {
  const hit = await prisma.killSwitchConfig.findFirst({
    where: { OR: [{ companyId }, { companyId: null }], feature: { in: features }, isDisabled: true },
  });
  return !!hit;
}

@Injectable()
export class EmailOutreachService {
  private readonly logger = new Logger(EmailOutreachService.name);

  constructor(private readonly prisma: PrismaService, private readonly integration: IntegrationService) {}

  async getScript(companyId: string, channel: OutreachChannel) {
    return (
      (await this.prisma.outreachScript.findFirst({
        where: { companyId, channel, isActive: true },
        orderBy: { updatedAt: 'desc' },
      })) ?? { id: null, ...DEFAULT_EMAIL_SCRIPT }
    );
  }

  /** Idempotent per (lead, EMAIL): a second call returns the existing campaign without resending. */
  async sendOutreachEmail(companyId: string, lead: SalesLead, agentId?: string) {
    if (!lead.contactEmail) throw new Error(`Lead ${lead.id} has no email`);
    if (lead.companyId !== companyId) throw new Error('Lead does not belong to company');
    if (await isKilled(this.prisma, companyId, ['GLOBAL_PRODUCTION', 'OUTBOUND_EMAIL', 'SALES_OUTREACH'])) {
      throw new Error('Outbound email blocked by kill switch');
    }

    const idempotencyKey = `outreach:${lead.id}:EMAIL`;
    let campaign;
    try {
      campaign = await this.prisma.outreachCampaign.create({
        data: { companyId, leadId: lead.id, channel: 'EMAIL', assignedAgentId: agentId, idempotencyKey },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return this.prisma.outreachCampaign.findUniqueOrThrow({ where: { idempotencyKey } });
      }
      throw e;
    }

    const script = await this.getScript(companyId, 'EMAIL');
    const vars = templateVars(lead);
    const env = outreachEnv();
    try {
      await this.integration.sendEmail(
        companyId,
        env,
        {
          to: lead.contactEmail,
          subject: renderTemplate(script.subjectTemplate ?? DEFAULT_EMAIL_SCRIPT.subjectTemplate, vars),
          body: renderTemplate(script.bodyTemplate, vars),
        },
        agentId,
      );
      return this.prisma.outreachCampaign.update({
        where: { id: campaign.id },
        data: { status: 'SENT', sentAt: new Date(), scriptId: script.id },
      });
    } catch (e) {
      this.logger.error(`Outreach email to lead ${lead.id} failed: ${e.message}`);
      return this.prisma.outreachCampaign.update({
        where: { id: campaign.id },
        data: { status: 'FAILED', error: e.message, scriptId: script.id },
      });
    }
  }

  /** Second-touch email for an earlier campaign. Idempotent per source campaign (`followup:<campaignId>`). */
  async sendFollowUp(companyId: string, lead: SalesLead, sourceCampaignId: string, template: { subjectTemplate: string; bodyTemplate: string }, agentId?: string) {
    if (!lead.contactEmail) throw new Error(`Lead ${lead.id} has no email`);
    if (lead.companyId !== companyId) throw new Error('Lead does not belong to company');
    if (await isKilled(this.prisma, companyId, ['GLOBAL_PRODUCTION', 'OUTBOUND_EMAIL', 'SALES_OUTREACH'])) {
      throw new Error('Outbound email blocked by kill switch');
    }
    const idempotencyKey = `followup:${sourceCampaignId}`;
    let campaign;
    try {
      campaign = await this.prisma.outreachCampaign.create({
        data: { companyId, leadId: lead.id, channel: 'EMAIL', assignedAgentId: agentId, idempotencyKey, notes: `Follow-up to campaign ${sourceCampaignId}` },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null; // already followed up
      throw e;
    }
    const vars = templateVars(lead);
    try {
      await this.integration.sendEmail(companyId, outreachEnv(), {
        to: lead.contactEmail,
        subject: renderTemplate(template.subjectTemplate, vars),
        body: renderTemplate(template.bodyTemplate, vars),
      }, agentId);
      return this.prisma.outreachCampaign.update({ where: { id: campaign.id }, data: { status: 'SENT', sentAt: new Date() } });
    } catch (e) {
      return this.prisma.outreachCampaign.update({ where: { id: campaign.id }, data: { status: 'FAILED', error: e.message } });
    }
  }
}
