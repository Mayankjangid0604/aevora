import { buildFeed } from './ceo-feed';

describe('CEO feed', () => {
  const review = (id: string, iso: string, decisions: any[]) => ({
    id, reviewedAt: new Date(iso), topRisk: 'Cash is thin', topOpportunity: 'Gyms convert', weeklyReport: 'All good.', decisionsProposed: decisions,
  });

  it('flattens reviews and weekly reports newest first, labelling each action', () => {
    const feed = buildFeed(
      [
        review('r2', '2026-09-24T10:00:00Z', [
          { type: 'CHANGE_LEAD_CATEGORY', reason: 'low conversion', parameters: {}, outcome: 'EXECUTED', detail: 'restaurant → cafe' },
          { type: 'PIPELINE_ACTION', kind: 'FOLLOW_UP', reason: 'no reply for 6 days', parameters: {}, outcome: 'EXECUTED', detail: 'Follow-up email to Biz A (sent)' },
          { type: 'REALLOCATE_AGENT', reason: 'x', parameters: {}, outcome: 'SKIPPED', detail: 'no idle agent' },
          { type: 'HIRE_AGENT', reason: 'need sales', parameters: {}, outcome: 'ESCALATED', detail: 'ManagementDecision md1' },
        ]),
        review('r1', '2026-09-24T08:00:00Z', []),
      ],
      [{ id: 'w1', createdAt: new Date('2026-09-24T09:00:00Z'), weekStartDate: new Date(), dealsWonCount: 2, revenueEarnedPaise: 3_000_000, biggestChallenge: 'slow replies', ceoCommentary: 'a\n\nb\n\nc' }],
    );
    expect(feed.map((i) => i.kind)).toEqual(['CATEGORY', 'FOLLOW_UP', 'ESCALATION', 'REVIEW', 'WEEKLY_REPORT', 'REVIEW']);
    expect(feed[0].title).toBe('Changed lead categories');
    expect(feed[1].title).toBe('Follow-up email to Biz A (sent)');
    expect(feed[2].title).toBe('Asked you to approve a hire (escalated)');
    expect(feed[0].detail).toContain('Why: low conversion');
    expect(feed[4].title).toBe('Weekly report: 2 deal(s), ₹30,000');
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => review(`r${i}`, new Date(2026, 8, 1, i % 24).toISOString(), []));
    expect(buildFeed(many, [], 20)).toHaveLength(20);
  });
});
