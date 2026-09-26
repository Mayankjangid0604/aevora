import { PipelineManagementService, DEFAULT_FOLLOW_UP } from './pipeline-management.service';
import { validScript } from './ceo-decisions.service';

function setup(over: Partial<Record<string, any>> = {}) {
  const prisma: any = {
    salesLead: { count: jest.fn(async () => over.newLeads ?? 20) },
    leadGenRun: { findFirst: jest.fn(async () => null) },
    killSwitchConfig: { findFirst: jest.fn(async () => (over.killed ? { id: 'k' } : null)) },
    outreachCampaign: {
      findMany: jest.fn(async (q: any) => (q.select ? (over.alreadyFollowed ?? []) : (over.silent ?? []))),
      count: jest.fn(async () => 0),
    },
    clientProject: {
      findMany: jest.fn(async (q: any) => (q.where.status === 'SAMPLE_SENT' ? (over.stale ?? []) : (over.paid ?? []))),
      updateMany: jest.fn(async () => ({ count: over.claim ?? 1 })),
      update: jest.fn(async () => ({})),
    },
  };
  const leadGen: any = { runForCompany: jest.fn(async () => ({ totalNew: 7 })) };
  const email: any = { sendFollowUp: jest.fn(async () => ({ status: 'SENT' })) };
  const integration: any = { sendEmail: jest.fn(async () => ({ success: true })) };
  const svc = new PipelineManagementService(prisma, leadGen, email, integration);
  (svc as any).gateway = { generate: jest.fn(async () => { throw new Error('offline'); }) }; // → default template
  return { svc, prisma, leadGen, email, integration };
}

const lead = (id: string) => ({ id, name: `Biz ${id}`, contactEmail: `${id}@x.in`, status: 'CONTACTED' });
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

describe('PipelineManagementService', () => {
  it('default follow-up template passes the script validator', () => {
    expect(validScript(DEFAULT_FOLLOW_UP)).not.toBeNull();
  });

  it('refills the lead queue when fewer than 10 NEW leads', async () => {
    const { svc, leadGen } = setup({ newLeads: 3 });
    const out = await svc.manage('c1', 'ceo');
    expect(leadGen.runForCompany).toHaveBeenCalledWith('c1', 'CEO');
    expect(out[0].detail).toMatch(/3 new leads.*found 7/);
  });

  it('follows up silent leads once, skipping ones already followed up, and never follows up a follow-up', async () => {
    const { svc, prisma, email } = setup({
      silent: [{ id: 'camp1', lead: lead('a'), sentAt: daysAgo(6) }, { id: 'camp2', lead: lead('b'), sentAt: daysAgo(9) }],
      alreadyFollowed: [{ idempotencyKey: 'followup:camp2' }],
    });
    await svc.manage('c1', 'ceo');
    expect(email.sendFollowUp).toHaveBeenCalledTimes(1);
    expect(email.sendFollowUp.mock.calls[0][2]).toBe('camp1');
    const where = prisma.outreachCampaign.findMany.mock.calls[0][0].where;
    expect(where.NOT).toEqual({ idempotencyKey: { startsWith: 'followup:' } });
  });

  it('offers a revision/10% on stale samples without touching the invoice, and only if it wins the claim', async () => {
    const stale = [{ id: 'p1', lead: lead('c'), quotedAmount: 1_500_000, sampleUrl: 'https://s/1', ceoNotes: null }];
    const won = setup({ stale });
    const out = await won.svc.manage('c1', 'ceo');
    expect(won.integration.sendEmail.mock.calls[0][2].body).toContain('10% off (₹1,500)');
    expect(won.prisma.clientProject.update.mock.calls[0][0].data.ceoNotes).toMatch(/NOT applied to the invoice/);
    expect(out.some((a) => /offered a revision/.test(a.detail!))).toBe(true);

    const lost = setup({ stale, claim: 0 });
    await lost.svc.manage('c1', 'ceo');
    expect(lost.integration.sendEmail).not.toHaveBeenCalled();
  });

  it('asks paid clients for a referral', async () => {
    const { svc, integration } = setup({ paid: [{ id: 'p2', lead: lead('d') }] });
    await svc.manage('c1', 'ceo');
    expect(integration.sendEmail.mock.calls[0][2].subject).toMatch(/one small request/);
  });

  it('sends nothing when outbound email is killed', async () => {
    const { svc, email, integration } = setup({ killed: true, silent: [{ id: 'x', lead: lead('e'), sentAt: daysAgo(8) }] });
    const out = await svc.manage('c1', 'ceo');
    expect(email.sendFollowUp).not.toHaveBeenCalled();
    expect(integration.sendEmail).not.toHaveBeenCalled();
    expect(out.at(-1)!.outcome).toBe('BLOCKED');
  });
});
