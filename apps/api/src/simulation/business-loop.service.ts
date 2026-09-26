import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SurvivalService } from '../survival/survival.service';
import { LeadGenService } from '../lead-gen/lead-gen.service';
import { SalesAgentWorker } from '../sales-outreach/sales-agent.worker';
import { DeliveryAgentWorker } from '../delivery/delivery-agent.worker';
import { InvoiceAndPaymentService } from '../delivery/invoice-payment.service';
import { CeoReviewService } from '../ceo/ceo-review.service';
import { MarketingContentService } from '../marketing-content/marketing-content.service';
import { InboundMessageService } from '../sales-outreach/inbound-message.service';

const INBOX_INTERVAL_MS = 10 * 60_000;

const HOUR = 3_600_000;
export const WORK_BLOCKING_FEATURES = ['GLOBAL_PRODUCTION', 'AGENT_WORK_CYCLES'];

/**
 * FIND → CONTACT → DISCOVER → BUILD → DELIVER → COLLECT → REPEAT, per company:
 *   1 survival (SHUTDOWN stops the company here)  2 lead gen (every LEAD_GEN_INTERVAL_HOURS)
 *   3 sales outreach  4 delivery  5 payment follow-ups  6 CEO review (once per simulation hour)
 * Voice commands execute synchronously on request; venture agents get work cycles
 * from the simulation tick once survival allows it.
 *
 * Driven from the simulation tick but throttled on REAL time and never awaited by the tick:
 * these steps call LLMs, SMTP and Places, which must not stall the 1s tick or scale with sim speed.
 */
@Injectable()
export class BusinessLoopService {
  private readonly logger = new Logger(BusinessLoopService.name);
  private running = false;
  private lastRunAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly survival: SurvivalService,
    private readonly leadGen: LeadGenService,
    private readonly sales: SalesAgentWorker,
    private readonly delivery: DeliveryAgentWorker,
    private readonly payments: InvoiceAndPaymentService,
    private readonly ceo: CeoReviewService,
    private readonly marketingContent: MarketingContentService,
    private readonly inbox: InboundMessageService,
  ) {}

  private readonly lastInboxCheck = new Map<string, number>();

  /** Called every tick. Starts a background pass when due; returns immediately. */
  runIfDue(now = Date.now()) {
    const interval = Number(process.env.BUSINESS_LOOP_INTERVAL_MS ?? 60_000);
    if (this.running || now - this.lastRunAt < interval) return false;
    this.lastRunAt = now;
    this.running = true;
    this.runOnce()
      .catch((e) => this.logger.error(`Business loop pass failed: ${e.message}`))
      .finally(() => (this.running = false));
    return true;
  }

  async runOnce() {
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    for (const c of companies) await this.runCompany(c.id);
  }

  async runCompany(companyId: string) {
    const s = await this.survival.checkSurvival(companyId).catch((e) => {
      this.logger.error(`[${companyId}] survival check failed: ${e.message}`);
      return null;
    });
    if (!s?.alive) return { companyId, alive: false };

    const result: Record<string, unknown> = { companyId, alive: true, status: s.status };
    result.leadGen = await this.step(companyId, 'lead-gen', () => this.leadGenIfDue(companyId));
    result.sales = await this.step(companyId, 'sales', () => this.sales.processQueue(companyId));
    result.delivery = await this.step(companyId, 'delivery', () => this.delivery.processQueue(companyId));
    result.paymentReminders = await this.step(companyId, 'payments', () => this.payments.check(companyId));
    result.ceoReview = await this.step(companyId, 'ceo-review', async () => {
      const r = await this.ceo.runIfDue(companyId);
      return typeof r === 'string' ? r : { reviewId: r.id };
    });
    // PIXEL's weekly calendar on Mondays (real day). Starts in the background; one per ISO week.
    if (new Date().getDay() === 1) {
      result.pixel = await this.step(companyId, 'pixel-content', async () => {
        if (await this.marketingContent.getCurrentCalendar(companyId)) return 'calendar exists';
        return this.marketingContent.runPixelWeeklyWork(companyId);
      });
    }
    // Gmail replies every 10 min (real time). No-op until INBOX_ENABLED=true.
    if (Date.now() - (this.lastInboxCheck.get(companyId) ?? 0) >= INBOX_INTERVAL_MS) {
      this.lastInboxCheck.set(companyId, Date.now());
      result.inbox = await this.step(companyId, 'inbox-check', async () => {
        const r = await this.inbox.checkInbox(companyId);
        return r.skipped ?? `checked ${r.checked} emails, ${r.newMessages} new lead replies`;
      });
    }
    return result;
  }

  private async leadGenIfDue(companyId: string) {
    const hours = Number(process.env.LEAD_GEN_INTERVAL_HOURS ?? 6);
    const last = await this.prisma.leadGenRun.findFirst({ where: { companyId }, orderBy: { triggeredAt: 'desc' } });
    if (last && Date.now() - last.triggeredAt.getTime() < hours * HOUR) return 'not_due';
    try {
      const run = await this.leadGen.runForCompany(companyId, 'SCHEDULE');
      return { runId: run.id, totalNew: run.totalNew };
    } catch (e) {
      if (e instanceof ConflictException || e instanceof ForbiddenException) return e.message;
      throw e;
    }
  }

  /** One failing step must not stop the rest of the loop. */
  private async step<T>(companyId: string, name: string, fn: () => Promise<T>) {
    try {
      return await fn();
    } catch (e) {
      this.logger.error(`[${companyId}] ${name} failed: ${e.message}`);
      return { error: e.message };
    }
  }
}
