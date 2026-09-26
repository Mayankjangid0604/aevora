import { scoreLead, LeadSearchService } from './lead-search.service';

describe('lead scoring', () => {
  it('ranks a reachable business with no website highest', () => {
    expect(scoreLead({ phone: 'x', email: 'y', website: null, reviewCount: 500 })).toBe(100);
    expect(scoreLead({ phone: null, email: null, website: 'w', reviewCount: 0 })).toBe(0);
    expect(scoreLead({ phone: 'x', email: null, website: 'w', reviewCount: 35 })).toBe(28);
  });

  it('mock mode skips known place ids', async () => {
    delete process.env.LEAD_GEN_PROVIDER_ENABLED;
    const svc = new LeadSearchService();
    const all = await svc.search({ category: 'gym', location: 'Sikar' });
    const rest = await svc.search({ category: 'gym', location: 'Sikar' }, new Set([all[0].googlePlaceId]));
    expect(rest).toHaveLength(all.length - 1);
  });
});
