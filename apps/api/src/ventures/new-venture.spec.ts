import { normalizePlan } from './new-venture.service';

describe('venture plan normalization', () => {
  it('caps team size and guarantees a Product Manager', () => {
    const plan = normalizePlan(
      { ventureName: 'SikarEats', teamNeeded: [{ role: 'Developer', skills: ['react'] }, { role: 'Sales', skills: [] }, { role: 'Designer' }], firstTask: 'Research' },
      'food delivery',
      3,
    );
    expect(plan.teamNeeded).toHaveLength(3);
    expect(plan.teamNeeded[0].role).toBe('Product Manager');
    expect(plan.teamNeeded.map((m) => m.role)).toEqual(['Product Manager', 'Developer', 'Sales']);
  });

  it('survives garbage model output', () => {
    const plan = normalizePlan(null, 'food delivery app for Sikar', 5);
    expect(plan.ventureName).toBe('food delivery app for Sikar');
    expect(plan.teamNeeded).toEqual([{ role: 'Product Manager', skills: ['planning', 'user research'] }]);
    expect(plan.firstTask).toContain('food delivery');
  });
});
