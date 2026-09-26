import { buildPins, leadCoordinates, SIKAR } from './map-data';

const lead = (id: string, over: Partial<any> = {}) => ({ id, name: `Biz ${id}`, status: 'NEW', industry: 'gym', geography: null, metadata: {}, ...over });

describe('leadCoordinates', () => {
  it('uses stored Google Places coordinates', () => {
    expect(leadCoordinates(lead('a', { metadata: { lat: 27.61, lng: 75.14 } }))).toEqual({ lat: 27.61, lng: 75.14, approximate: false });
  });
  it('falls back to a stable approximate spot near Sikar', () => {
    const a = leadCoordinates(lead('abc'));
    expect(a).toEqual(leadCoordinates(lead('abc')));
    expect(a.approximate).toBe(true);
    expect(Math.abs(a.lat - SIKAR.lat)).toBeLessThan(0.05);
    expect(Math.abs(a.lng - SIKAR.lng)).toBeLessThan(0.05);
  });
});

describe('buildPins', () => {
  it('shows one pin per business, project replacing its lead, and splits pipeline from paid', () => {
    const { pins, summary } = buildPins(
      [lead('l1'), lead('l2', { status: 'CONVERTED' }), lead('l3'), lead('l4')],
      [
        { id: 'p1', status: 'BUILDING', quotedAmount: 800000, lead: lead('l1') },
        { id: 'p2', status: 'PAID', quotedAmount: 1500000, lead: lead('l2') },
        { id: 'p4', status: 'FAILED', quotedAmount: 999, lead: lead('l4') },
      ],
    );
    expect(pins.map((p) => [p.id, p.type])).toEqual([['p1', 'PROJECT'], ['p2', 'PAID_CLIENT'], ['l3', 'LEAD'], ['l4', 'LEAD']]);
    expect(summary).toMatchObject({ totalPins: 4, leads: 2, activeProjects: 1, paidClients: 1, totalPipelineRs: 8000, paidRs: 15000, approximatePins: 4 });
  });
});
