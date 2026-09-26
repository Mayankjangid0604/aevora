import { Injectable, Logger } from '@nestjs/common';
import { ModelGateway, ModelTier } from '@aevora/model-gateway';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../devices/realtime.gateway';
import { CeoReviewService, findCeo, parseJson } from '../ceo/ceo-review.service';
import { IdeasService } from '../ideas/ideas.service';
import { MarketingContentService } from '../marketing-content/marketing-content.service';
import { InboundMessageService } from '../sales-outreach/inbound-message.service';
import { LeadGenService } from '../lead-gen/lead-gen.service';
import { SimulationService } from '../simulation/simulation.service';
import { ResponseCacheService } from './response-cache.service';

export const ASSISTANT_INTENTS = [
  'STATUS_REPORT', 'COMMAND_CEO', 'NEW_VENTURE', 'FIND_LEADS', 'PAUSE_SIMULATION',
  'RESUME_SIMULATION', 'CHECK_REVENUE', 'WHATSAPP_MESSAGE', 'ASK_CEO',
  'GENERATE_POST', 'GENERATE_CALENDAR', 'WHATSAPP_BROADCAST', 'CHECK_INBOX', 'CUSTOM',
] as const;
export type AssistantIntentName = (typeof ASSISTANT_INTENTS)[number];

export interface ParsedIntent {
  intent: AssistantIntentName;
  target: string;
  parameters: Record<string, any>;
  reply: string;
}

const INTENT_SYSTEM = `You are an intent parser for the personal AI assistant of the Chairman of SAAHVIK Tech.
Parse the Chairman's message and return JSON only.
Valid intents: ${ASSISTANT_INTENTS.join(', ')}`;

const intentPrompt = (message: string) => `Parse this message from the Chairman and return JSON:
Message: "${message}"

Return this exact JSON structure:
{
  "intent": "one of the valid intents above",
  "target": "CEO | SALES | DEVELOPMENT | MARKETING | ALL",
  "parameters": {
    "instruction": "if COMMAND_CEO or CUSTOM",
    "idea": "if NEW_VENTURE",
    "question": "if ASK_CEO",
    "phone": "if WHATSAPP_MESSAGE",
    "message": "if WHATSAPP_MESSAGE"
  },
  "reply": "a friendly 1 sentence acknowledgement in same language as input"
}

Return ONLY valid JSON. No explanation.`;

/** Model output → a safe intent. Anything unknown or malformed becomes CUSTOM (forwarded to the CEO). */
export function normalizeAssistantIntent(raw: any, message: string): ParsedIntent {
  const intent = ASSISTANT_INTENTS.includes(raw?.intent) ? raw.intent : 'CUSTOM';
  const parameters = raw?.parameters && typeof raw.parameters === 'object' ? raw.parameters : {};
  if ((intent === 'COMMAND_CEO' || intent === 'CUSTOM') && !String(parameters.instruction ?? '').trim()) parameters.instruction = message;
  if (intent === 'NEW_VENTURE' && !String(parameters.idea ?? '').trim()) parameters.idea = message;
  if (intent === 'ASK_CEO' && !String(parameters.question ?? '').trim()) parameters.question = message;
  return {
    intent,
    target: typeof raw?.target === 'string' ? raw.target : 'CEO',
    parameters,
    reply: typeof raw?.reply === 'string' && raw.reply.trim() ? raw.reply.trim() : 'Samajh gaya. CEO ko forward kar raha hun.',
  };
}

const fast = (intent: AssistantIntentName, parameters: Record<string, any> = {}, target = 'ALL'): ParsedIntent =>
  ({ intent, target, parameters, reply: '' });

// Side-effect commands must be the whole message, so "tell CEO not to pause outreach" can't pause the simulation.
const PAUSE_PHRASES = new Set(['pause', 'pause simulation', 'pause the simulation', 'stop simulation', 'stop the simulation', 'ruk jao', 'band karo', 'simulation band karo', 'simulation roko']);
const RESUME_PHRASES = new Set(['resume', 'resume simulation', 'resume the simulation', 'start simulation', 'start the simulation', 'chalu karo', 'shuru karo', 'simulation chalu karo', 'simulation shuru karo']);

/**
 * Keyword routing for common commands — answers without the 40–65 s phi4 intent parse.
 * Returns null when the message needs the model. Order matters: explicit CEO commands first,
 * so "tell CEO we need more money" stays a directive instead of a revenue check.
 */
export function detectSimpleIntent(message: string): ParsedIntent | null {
  const text = message.trim();
  const msg = text.toLowerCase().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');

  let m = text.match(/^(?:ask (?:the )?ceo|ceo se pucho|ceo ko pucho)\s*[:,\-]?\s*(.+)$/i);
  if (m) return fast('ASK_CEO', { question: m[1].trim() }, 'CEO');

  m = text.match(/^(?:tell (?:the )?ceo|ceo ko bolo|ceo se kaho)\s*[:,\-]?\s*(?:to |that )?(.+)$/i);
  if (m) return fast('COMMAND_CEO', { instruction: m[1].trim() }, 'CEO');

  m = text.match(/^(?:new venture|startup idea|new idea|naya idea|idea|i have an idea)\s*[:\-]\s*(.+)$/i);
  if (m) return fast('NEW_VENTURE', { idea: m[1].trim() }, 'CEO');

  if (PAUSE_PHRASES.has(msg)) return fast('PAUSE_SIMULATION');
  if (RESUME_PHRASES.has(msg)) return fast('RESUME_SIMULATION');
  if (/^(?:find|search|get|search for)(?: new| more)? (?:leads?|clients?|business(?:es)?)$/.test(msg) || msg === 'leads dhundo') return fast('FIND_LEADS');

  // PIXEL content — only drafts are created, so loose matching is fine; checked before the lookups
  // so "generate post about revenue growth" makes a post, not a revenue report.
  if (/\b(?:content calendar|weekly calendar|week ka content|generate calendar)\b/.test(msg)) return fast('GENERATE_CALENDAR', {}, 'MARKETING');
  if (/\b(?:whatsapp broadcast|broadcast message|broadcast bhejo)\b/.test(msg)) return fast('WHATSAPP_BROADCAST', {}, 'MARKETING');
  if (/\b(?:(?:generate|create) (?:an? )?(?:instagram )?post|instagram post|content banao|post banao)\b/.test(msg)) {
    const topic = text
      .replace(/^.*?\bpost\b\s*(?:about|on|for|ke baare mein)?\s*/i, '')
      .replace(/\b(?:content|post)?\s*banao\b/i, '')
      .trim();
    return fast('GENERATE_POST', { topic: topic || 'SAAHVIK Tech services for local businesses' }, 'MARKETING');
  }

  // Inbox check: only reads Gmail and classifies lead replies.
  if (/\b(?:check (?:inbox|emails?|mail)|email dekho|mail dekho|koi reply|any repl(?:y|ies)|new emails?)\b/.test(msg)) return fast('CHECK_INBOX', {}, 'INBOX');

  // Read-only lookups: loose matching is safe, the worst case is an extra report.
  if (/\b(?:revenue|money|balance|earnings?|income|paisa|paise|rupees?)\b/.test(msg)) return fast('CHECK_REVENUE');
  if (/\b(?:status|report|overview)\b/.test(msg) || msg === 'how are we doing' || msg.includes('kya haal')) return fast('STATUS_REPORT');

  return null;
}

const rupees = (paise: number) => `Rs${Math.round(paise / 100).toLocaleString('en-IN')}`;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly gateway = new ModelGateway();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly ceoReview: CeoReviewService,
    private readonly ideas: IdeasService,
    private readonly marketingContent: MarketingContentService,
    private readonly inbox: InboundMessageService,
    private readonly leadGen: LeadGenService,
    private readonly simulation: SimulationService,
    private readonly cache: ResponseCacheService,
  ) {}

  async processMessage(message: string, companyId: string): Promise<{ response: string; intent: string; actions: string[] }> {
    this.logger.log(`Assistant received: "${message.substring(0, 80)}"`);
    const incoming = await this.prisma.assistantMessage.create({
      data: { companyId, from: 'CHAIRMAN', to: 'ASSISTANT', content: message, status: 'PROCESSING' },
    });

    // Keyword routing first, then a cached phi4 parse, and only then phi4 itself (40–65 s on CPU).
    let intent = detectSimpleIntent(message);
    let source = 'keyword';
    if (!intent) {
      const cacheKey = message.toLowerCase().substring(0, 200);
      intent = this.cache.get<ParsedIntent>('PARSED_INTENT', companyId, cacheKey) ?? null;
      source = 'cache';
      if (!intent) {
        this.logger.log('Calling phi4 for intent parsing...');
        intent = await this.parseIntent(message);
        source = 'phi4';
        this.cache.set('PARSED_INTENT', companyId, intent, cacheKey);
      }
    }
    this.logger.log(`Intent: ${intent.intent} → target: ${intent.target} (via ${source})`);

    const actions: string[] = [];
    let response = intent.reply;
    let failed = false;
    try {
      switch (intent.intent) {
        case 'STATUS_REPORT':
          response = await this.cached('STATUS_REPORT', companyId, '', '30s', () => this.getStatusReport(companyId));
          actions.push('status_report_generated');
          break;
        case 'COMMAND_CEO':
          await this.commandCeo(companyId, intent, message, incoming.id);
          actions.push('ceo_directive_sent');
          response = `Directive sent to ARIA (CEO): "${intent.parameters.instruction}"`;
          break;
        case 'NEW_VENTURE': {
          // Submitted as an idea: the CEO evaluates it before any team is formed.
          const text = String(intent.parameters.idea);
          const title = text.length > 60 ? `${text.slice(0, 57)}...` : text;
          await this.ideas.submitIdea(companyId, title, text, 'CHAIRMAN');
          actions.push('idea_submitted');
          response = `Idea submitted: "${title}". CEO (ARIA) is evaluating it now. Check /ideas for the result in about a minute.`;
          break;
        }
        case 'FIND_LEADS':
          // Lead search calls Google Places and can take minutes — don't hold the chat open for it.
          // Throttled to once per 5 min: each run spends Google Places quota.
          if (this.cache.get('FIND_LEADS', companyId)) {
            response = 'A lead search already started in the last 5 minutes. New businesses will appear in Sales shortly.';
            actions.push('lead_gen_throttled');
            break;
          }
          this.cache.set('FIND_LEADS', companyId, true);
          this.leadGen.runForCompany(companyId, 'ASSISTANT').catch((e) => this.logger.error(`[${companyId}] assistant lead-gen failed: ${e.message}`));
          actions.push('lead_gen_triggered');
          response = 'Lead search started. New businesses will appear in Sales in a few minutes.';
          break;
        case 'PAUSE_SIMULATION':
          await this.simulation.pause(companyId);
          this.cache.invalidateAll(companyId);
          actions.push('simulation_paused');
          response = 'Simulation paused. All agents stopped.';
          break;
        case 'RESUME_SIMULATION':
          await this.simulation.resume(companyId);
          this.cache.invalidateAll(companyId);
          actions.push('simulation_resumed');
          response = 'Simulation resumed. All agents are working.';
          break;
        case 'CHECK_REVENUE':
          response = await this.cached('CHECK_REVENUE', companyId, '', '30s', () => this.getRevenueReport(companyId));
          actions.push('revenue_checked');
          break;
        case 'WHATSAPP_MESSAGE':
          await this.prisma.pcTask.create({
            data: { companyId, taskType: 'WHATSAPP', instruction: JSON.stringify({ phone: intent.parameters.phone, message: intent.parameters.message }) },
          });
          actions.push('whatsapp_queued');
          response = `WhatsApp message queued for ${intent.parameters.phone ?? 'the contact'}. Check the PC Tasks panel.`;
          break;
        case 'ASK_CEO':
          response = await this.cached('ASK_CEO', companyId, String(intent.parameters.question).toLowerCase().substring(0, 200), '2 min',
            async () => (await this.ceoReview.answerChairman(companyId, intent!.parameters.question)).answer);
          actions.push('ceo_queried');
          break;
        case 'GENERATE_POST': {
          const post = await this.marketingContent.generatePost(companyId, 'SERVICE_SHOWCASE', intent.parameters.topic || 'SAAHVIK Tech services');
          actions.push('post_generated');
          response = `Instagram post generated!

${post.caption}

Hashtags: ${post.hashtags.slice(0, 5).join(' ')}

Check /marketing for the full post.`;
          break;
        }
        case 'GENERATE_CALENDAR': {
          const calendar = await this.marketingContent.generateWeeklyCalendar(companyId);
          const n = Array.isArray(calendar.posts) ? calendar.posts.length : 0;
          actions.push('calendar_generated');
          response = `Weekly content calendar ready. Theme: "${calendar.theme}". ${n} posts drafted. Check /marketing to see them.`;
          break;
        }
        case 'WHATSAPP_BROADCAST': {
          const message = await this.marketingContent.generateWhatsAppBroadcast('local business', 'free website demo');
          actions.push('broadcast_generated');
          response = `WhatsApp broadcast message:

${message}

Copy this and send from WhatsApp Web.`;
          break;
        }
        case 'CHECK_INBOX': {
          const r = await this.inbox.checkInbox(companyId);
          actions.push('inbox_checked');
          if (r.skipped) response = `Inbox not checked: ${r.skipped}. Enable IMAP in Gmail and set INBOX_ENABLED=true in .env.`;
          else if (r.newMessages === 0) response = `Inbox checked (${r.checked} emails in the last 7 days). No new replies from leads.`;
          else response = `Found ${r.newMessages} new repl${r.newMessages > 1 ? 'ies' : 'y'} from leads — classified. Check /inbox to see them.`;
          break;
        }
        case 'CUSTOM':
        default:
          await this.commandCeo(companyId, intent, message, incoming.id);
          actions.push('forwarded_to_ceo');
          response = 'Message forwarded to ARIA (CEO). She will handle it in the next review cycle.';
          break;
      }
    } catch (err) {
      failed = true;
      this.logger.error(`Action ${intent.intent} failed: ${err.message}`);
      response = `I understood you want to ${intent.intent.toLowerCase().replace(/_/g, ' ')}, but something went wrong: ${err.message}`;
      actions.push('action_failed');
    }

    await this.prisma.assistantMessage.update({
      where: { id: incoming.id },
      data: { intent: intent as any, result: { actions }, status: failed ? 'FAILED' : 'DONE' },
    });
    await this.prisma.assistantMessage.create({
      data: { companyId, from: 'ASSISTANT', to: 'CHAIRMAN', content: response, intent: intent as any, result: { actions }, status: 'DONE' },
    });

    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { chairmanId: true } });
    this.realtime.broadcastToUser(company.chairmanId, 'assistant.reply', { response, intent: intent.intent, actions });

    return { response, intent: intent.intent, actions };
  }

  /** Cache-or-compute; a cached reply says so, since it can be up to one TTL old. */
  private async cached(intent: string, companyId: string, extra: string, age: string, compute: () => Promise<string>): Promise<string> {
    const hit = this.cache.get<string>(intent, companyId, extra);
    if (hit !== undefined) return `${hit}
(cached — refreshes every ${age})`;
    const fresh = await compute();
    this.cache.set(intent, companyId, fresh, extra);
    return fresh;
  }

  async parseIntent(message: string): Promise<ParsedIntent> {
    try {
      const raw = await this.gateway.callWithTier(ModelTier.LOCAL_BASIC, intentPrompt(message), INTENT_SYSTEM, { json: true });
      return normalizeAssistantIntent(parseJson(raw), message);
    } catch (e) {
      this.logger.warn(`Intent parsing failed, using CUSTOM: ${e.message}`);
      return normalizeAssistantIntent(null, message);
    }
  }

  private async getStatusReport(companyId: string): Promise<string> {
    const [survival, account, leads, projects, employees] = await Promise.all([
      this.prisma.survivalConfig.findUnique({ where: { companyId } }),
      this.prisma.realMoneyAccount.findUnique({ where: { companyId } }),
      this.prisma.salesLead.groupBy({ by: ['status'], where: { companyId }, _count: true }),
      this.prisma.clientProject.groupBy({ by: ['status'], where: { companyId }, _count: true }),
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
    ]);
    const l = Object.fromEntries(leads.map((g) => [g.status, g._count])) as Record<string, number>;
    const p = Object.fromEntries(projects.map((g) => [g.status, g._count])) as Record<string, number>;
    return `SAAHVIK Tech Status Report:
Balance: ${rupees(account?.balance ?? 0)} | Survival: ${survival?.currentStatus ?? 'UNKNOWN'}
Employees: ${employees} active
Leads: ${l.NEW ?? 0} new, ${l.CONTACTED ?? 0} contacted, ${l.QUALIFIED ?? 0} qualified, ${l.CONVERTED ?? 0} converted
Projects: ${p.BUILDING ?? 0} building, ${p.SAMPLE_SENT ?? 0} sample sent, ${p.PAID ?? 0} paid`;
  }

  private async getRevenueReport(companyId: string): Promise<string> {
    const account = await this.prisma.realMoneyAccount.findUnique({
      where: { companyId },
      include: { transactions: { where: { referenceType: 'CLIENT_PAYMENT' }, orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    const payments = account?.transactions ?? [];
    const total = payments.reduce((s, t) => s + t.amount, 0);
    return `Revenue Report:
Current balance: ${rupees(account?.balance ?? 0)}
Last 5 client payments total: ${rupees(total)}
Payments: ${payments.map((t) => rupees(t.amount)).join(', ') || 'none yet'}`;
  }

  /** Same shape as voice directives (source CHAIRMAN_VOICE) so the CEO review picks it up as an unread directive. */
  private async commandCeo(companyId: string, intent: ParsedIntent, message: string, assistantMessageId: string) {
    const ceo = await findCeo(this.prisma, companyId);
    if (!ceo) throw new Error('No active CEO found');
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { chairmanId: true } });
    await this.prisma.managementDecision.create({
      data: {
        companyId,
        type: 'GENERAL',
        title: `Chairman directive via Assistant: ${message.slice(0, 80)}`,
        description: intent.parameters.instruction ?? message,
        proposerId: ceo.id, // proposer must be an Employee; the Chairman is recorded as approver
        targetEmployeeId: ceo.id,
        payload: { source: 'CHAIRMAN_VOICE', via: 'ASSISTANT', assistantMessageId, intent: intent.intent, parameters: intent.parameters, transcript: message },
        status: 'APPROVED',
        approvedBy: company.chairmanId,
        approvedAt: new Date(),
      },
    });
  }

  getRecentMessages(companyId: string, limit = 20) {
    return this.prisma.assistantMessage.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: limit });
  }

  getPendingPcTasks(companyId: string) {
    return this.prisma.pcTask.findMany({ where: { companyId, status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
  }
}
