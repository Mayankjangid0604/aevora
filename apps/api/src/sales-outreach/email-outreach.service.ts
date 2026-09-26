import { Injectable, Logger } from '@nestjs/common';
import { ExecutionEnvironment, OutreachChannel, Prisma, SalesLead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationService } from '../integration/integration.service';
import { DemoFactoryService } from './demo-factory.service';

export const DEFAULT_EMAIL_SCRIPT = {
  templateName: 'default-email-intro',
  subjectTemplate: 'Quick idea for {{businessName}}',
  bodyTemplate: `Namaste {{businessName}} team,

This is {{companyName}}, Sikar. We help local {{category}} businesses get more customers online — a simple website, Google profile setup, and WhatsApp auto-replies.

Would you be open to a free sample of what this could look like for {{businessName}}? Just reply "yes" and we'll send it over within a couple of days.

{{signature}}`,
};

/** The only sign-off used on client-facing messages — never a personal name. */
export function emailSignature(): string {
  const phone = (process.env.COMPANY_PHONE ?? '+919530301131').replace(/^\+91(?=\d{10}$)/, '+91 ');
  return `Team ${process.env.COMPANY_NAME ?? 'SAAHVIK Tech'} | ${process.env.SMTP_USER ?? 'saahvik2026@gmail.com'} | ${phone}`;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

export function templateVars(lead: Pick<SalesLead, 'name' | 'industry'>): Record<string, string> {
  return {
    businessName: lead.name,
    category: lead.industry ?? 'local',
    // Legacy placeholder in stored/LLM-written scripts: resolves to the team, never the Chairman's personal name.
    chairmanName: `Team ${process.env.COMPANY_NAME ?? 'SAAHVIK Tech'}`,
    companyName: process.env.COMPANY_NAME ?? 'SAAHVIK Tech',
    signature: emailSignature(),
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: IntegrationService,
    private readonly demoFactory: DemoFactoryService
  ) {}

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

    const env = outreachEnv();
    
    // 1. Build and Deploy Demo
    const demoUrl = await this.demoFactory.createAndDeployDemo(lead.name, lead.industry ?? 'business');

    // 2. Generate Professional Email using ModelGateway
    const modelGateway = new (require('@aevora/model-gateway').ModelGateway)();
    const vars = templateVars(lead);
    
    let subject = `Exclusive Proposal for ${lead.name}`;
    let body = `Dear ${lead.name} Team,

I'm ${vars.chairmanName} from ${vars.companyName}. We specialize in professional website development, business automation, custom CRM, and SaaS solutions.

We have done some research on your business and built a custom demo website specifically for you to see what we can do.`;
    
    if (demoUrl) {
      body += `\n\nYou can view your live demo here: ${demoUrl}`;
    }
    
    body += `\n\nIf you're interested in taking this further or exploring automation solutions to scale your business, I'd love to schedule a quick call.

${vars.signature}`;

    try {
      const prompt = `Write a highly professional, polite, and persuasive B2B sales email to "${lead.name}" (Industry: "${lead.industry || 'Business'}"). 
We are "${vars.companyName}", offering "website development, business automation, custom CRM, and SaaS". 
${demoUrl ? 'Mention this demo link we built for them: ' + demoUrl : ''}
Keep it concise, professional, and focus on value. Return only the email body (no subject line), with NO greeting sign-off or name at the end.`;

      const aiRes = await modelGateway.generate({ prompt: `System: You are a professional B2B sales executive.\n\n` + prompt });
      body = `${aiRes.text.trim()}

${vars.signature}`;
    } catch (e) {
      this.logger.warn(`AI email generation failed, falling back to static template: ${e.message}`);
    }

    try {
      await this.integration.sendEmail(
        companyId,
        env,
        {
          to: lead.contactEmail,
          subject,
          body,
        },
        agentId,
      );
      return this.prisma.outreachCampaign.update({
        where: { id: campaign.id },
        data: { status: 'SENT', sentAt: new Date(), scriptId: null },
      });
    } catch (e) {
      this.logger.error(`Outreach email to lead ${lead.id} failed: ${e.message}`);
      return this.prisma.outreachCampaign.update({
        where: { id: campaign.id },
        data: { status: 'FAILED', error: e.message, scriptId: null },
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
