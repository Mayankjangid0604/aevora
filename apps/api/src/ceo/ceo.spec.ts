import { normalizeReview, simHourKey, isWeekdayNine } from './ceo-review.service';
import { applyCategoryChange, cleanCategory, validScript, CeoDecisionsService } from './ceo-decisions.service';

describe('CEO review parsing', () => {
  it('keeps only whitelisted decision types, max 3, with safe parameters', () => {
    const r = normalizeReview({
      topRisk: 'Cash is thin',
      decisionsProposed: [
        { type: 'CHANGE_LEAD_CATEGORY', reason: 'gyms convert', parameters: { add: ['gym'] } },
        { type: 'DROP_DATABASE', reason: 'x' },
        { type: 'HIRE_AGENT', parameters: ['bad'] },
        { type: 'PAUSE_VENTURE', reason: 'idle' },
        { type: 'REALLOCATE_AGENT', reason: 'too many' },
      ],
    });
    expect(r.decisionsProposed.map((d) => d.type)).toEqual(['CHANGE_LEAD_CATEGORY', 'HIRE_AGENT', 'PAUSE_VENTURE']);
    expect(r.decisionsProposed[1].parameters).toEqual({});
    expect(r.decisionsProposed[1].reason).toBe('No reason given');
    expect(r.topRisk).toBe('Cash is thin');
    expect(r.weeklyReport).toMatch(/could not/);
  });

  it('keys reviews by simulation hour and detects weekday 9am', () => {
    const mon9 = new Date(2026, 8, 28, 9, 30); // Mon 28 Sep 2026
    expect(simHourKey(mon9)).toBe('2026-09-28T09');
    expect(isWeekdayNine(mon9)).toBe(true);
    expect(isWeekdayNine(new Date(2026, 8, 27, 9, 0))).toBe(false); // Sunday
    expect(isWeekdayNine(new Date(2026, 8, 28, 10, 0))).toBe(false);
  });
});

describe('CEO decisions', () => {
  it('cleans and applies category changes without ever emptying the list', () => {
    expect(cleanCategory('  Hair SALON!! ')).toBe('hair salon');
    expect(cleanCategory(42)).toBeNull();
    expect(applyCategoryChange(['restaurant', 'gym'], { add: ['Salon', 'gym'], remove: 'restaurant' })).toEqual(['gym', 'salon']);
    expect(applyCategoryChange(['gym'], { remove: ['gym'] })).toEqual(['gym']);
  });

  it('accepts only scripts with known placeholders that keep {{businessName}}', () => {
    const body = 'Namaste {{businessName}} team, we help local {{category}} shops get found online. Could we send you a free sample? — {{chairmanName}}';
    expect(validScript({ subjectTemplate: 'Idea for {{businessName}}', bodyTemplate: body })).not.toBeNull();
    expect(validScript({ subjectTemplate: 'Hi', bodyTemplate: body })).toBeNull();
    expect(validScript({ subjectTemplate: 'Idea for you', bodyTemplate: body.replace('{{businessName}}', 'there') })).toBeNull();
    expect(validScript({ subjectTemplate: 'Idea {{secret}}', bodyTemplate: body })).toBeNull();
  });

  it('escalates non-auto decisions and blocks auto ones when autonomy is off', async () => {
    const prisma: any = { managementDecision: { create: jest.fn(async () => ({ id: 'md1' })) } };
    const dialogue: any = { ask: jest.fn() };
    const svc = new CeoDecisionsService(prisma, {} as any, {} as any, {} as any, dialogue);
    const out = await svc.apply('c1', 'ceo1', [
      { type: 'HIRE_AGENT', reason: 'need sales help', parameters: {} },
      { type: 'PAUSE_VENTURE', reason: 'idle', parameters: {} },
    ], false);
    expect(out.map((d) => d.outcome)).toEqual(['ESCALATED', 'BLOCKED']);
    expect(prisma.managementDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'HIRING', status: 'PROPOSED', proposerId: 'ceo1' }),
    }));
  });
});
