import { ConflictException } from '@nestjs/common';
import { BusinessLoopService } from './business-loop.service';

function setup(alive: boolean, lastRunAgoMs: number | null) {
  const calls: string[] = [];
  const prisma: any = {
    company: { findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]) },
    leadGenRun: {
      findFirst: jest.fn().mockResolvedValue(lastRunAgoMs === null ? null : { triggeredAt: new Date(Date.now() - lastRunAgoMs) }),
    },
  };
  const survival: any = { checkSurvival: jest.fn(async () => { calls.push('survival'); return { alive, status: alive ? 'HEALTHY' : 'SHUTDOWN' }; }) };
  const leadGen: any = { runForCompany: jest.fn(async () => { calls.push('leadGen'); return { id: 'r1', totalNew: 3 }; }) };
  const sales: any = { processQueue: jest.fn(async () => { calls.push('sales'); throw new Error('smtp down'); }) };
  const delivery: any = { processQueue: jest.fn(async () => { calls.push('delivery'); return {}; }) };
  const payments: any = { check: jest.fn(async () => { calls.push('payments'); return 0; }) };
  const ceo: any = { runIfDue: jest.fn(async () => { calls.push('ceo'); return 'not_due'; }) };
  return { svc: new BusinessLoopService(prisma, survival, leadGen, sales, delivery, payments, ceo, { getCurrentCalendar: async () => ({}), runPixelWeeklyWork: () => "started" } as any, { checkInbox: async () => ({ checked: 0, newMessages: 0, classified: 0, skipped: 'off' }) } as any), calls, leadGen };
}

describe('BusinessLoopService', () => {
  it('runs steps in order and a failing step does not stop the rest', async () => {
    const { svc, calls } = setup(true, null);
    const r: any = await svc.runCompany('c1');
    expect(calls).toEqual(['survival', 'leadGen', 'sales', 'delivery', 'payments', 'ceo']);
    expect(r.sales).toEqual({ error: 'smtp down' });
  });

  it('stops after survival when the company is shut down', async () => {
    const { svc, calls } = setup(false, null);
    expect(await svc.runCompany('c1')).toEqual({ companyId: 'c1', alive: false });
    expect(calls).toEqual(['survival']);
  });

  it('skips lead gen until the interval has passed, tolerates an in-progress run', async () => {
    const recent = setup(true, 60_000);
    expect((await recent.svc.runCompany('c1') as any).leadGen).toBe('not_due');
    const busy = setup(true, 7 * 3_600_000);
    busy.leadGen.runForCompany.mockRejectedValueOnce(new ConflictException('already running'));
    expect((await busy.svc.runCompany('c1') as any).leadGen).toBe('already running');
  });

  it('throttles background passes', () => {
    const { svc } = setup(true, null);
    expect(svc.runIfDue(1_000_000)).toBe(true);
    expect(svc.runIfDue(1_000_500)).toBe(false);
  });
});
