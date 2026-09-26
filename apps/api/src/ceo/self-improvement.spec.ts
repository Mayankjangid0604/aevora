import { planCategoryChanges, replaceOpening, CategoryStats, SelfImprovementService } from './self-improvement.service';
import { applyCategoryChange } from './ceo-decisions.service';

const stat = (category: string, contacted: number, conversions: number): CategoryStats => ({
  category, contacted, conversions, responses: conversions, avgRevenuePaise: 0, conversionRate: contacted ? conversions / contacted : 0,
});

describe('ConversionTracker rules', () => {
  it('drops low converters for an adjacent category, boosts high converters, ignores small samples', () => {
    const plan = planCategoryChanges(
      [stat('restaurant', 12, 0), stat('gym', 10, 4), stat('salon', 4, 0), stat('retail_shop', 8, 1)],
      ['restaurant', 'gym', 'salon', 'retail_shop'],
      [],
      {},
    );
    expect(plan.remove).toEqual(['restaurant']);
    expect(plan.add).toEqual(['cafe']);
    expect(plan.boost).toEqual(['gym']); // 40% > 30%
    // salon: only 4 contacted → no decision; retail_shop 12.5% → in between → no change
  });

  it('never proposes a category that was dropped before, or one already boosted', () => {
    const plan = planCategoryChanges([stat('restaurant', 10, 0), stat('gym', 10, 5)], ['restaurant', 'gym'], ['cafe', 'bakery'], { gym: 2 });
    expect(plan.add).toEqual(['sweet shop']);
    expect(plan.boost).toEqual([]);
    expect(applyCategoryChange(['gym'], { add: ['cafe', 'spa'] }, ['cafe'])).toEqual(['gym', 'spa']);
  });
});

describe('OutreachScriptOptimizer', () => {
  it('replaces only the opening paragraph', () => {
    expect(replaceOpening('Hi {{businessName}},\n\nOld opener.\n\nRegards', 'New opener.')).toBe('Hi {{businessName}},\n\nNew opener.\n\nRegards');
  });

  function setup(n: number, positive: number, evaluatedAtCount = 0) {
    const script = { id: 's1', templateName: 'v1', subjectTemplate: 'Quick idea for {{businessName}}', bodyTemplate: 'Namaste {{businessName}} team,\n\nWe help local {{category}} businesses get online with a website and WhatsApp replies.\n\nRegards,\n{{chairmanName}}', parentId: null, evaluatedAtCount };
    const created = { id: 's2', templateName: 'ceo-ab-1' };
    const prisma: any = {
      salesLead: { findMany: jest.fn(async () => []) },
      leadGenConfig: { findUnique: jest.fn(async () => null) },
      outreachScript: {
        findMany: jest.fn(async () => [script]),
        update: jest.fn(async () => ({})),
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => created),
      },
      outreachCampaign: { count: jest.fn(async (q: any) => (q.where.outcome ? positive : n)) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    const leadGen: any = { categoriesFor: jest.fn(async () => ['restaurant']) };
    const svc = new SelfImprovementService(prisma, leadGen, {} as any);
    (svc as any).gateway = {
      generate: jest.fn(async () => ({ structuredOutput: { subjectTemplate: 'A free sample for {{businessName}}', openingParagraph: 'We built a sample site for a {{category}} near you — want one?' } })),
    };
    return { svc, prisma };
  }

  it('rewrites a script under 15% after 10 campaigns and deactivates the old version', async () => {
    const { svc, prisma } = setup(10, 1);
    const out = await svc.run('c1', 'ceo', true);
    expect(prisma.outreachScript.create.mock.calls[0][0].data).toMatchObject({ parentId: 's1', subjectTemplate: 'A free sample for {{businessName}}' });
    expect(prisma.outreachScript.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { isActive: false } });
    expect(out[0]).toMatchObject({ outcome: 'EXECUTED' });
  });

  it('leaves a working script alone and waits for the next batch of 10', async () => {
    const good = setup(10, 3);
    expect((await good.svc.run('c1', 'ceo', true))[0].outcome).toBe('SKIPPED');
    expect(good.prisma.outreachScript.create).not.toHaveBeenCalled();

    const early = setup(15, 0, 10); // evaluated at 10, next check at 20
    expect(await early.svc.run('c1', 'ceo', true)).toEqual([]);
  });
});
