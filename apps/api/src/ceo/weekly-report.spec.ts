import { reportWeek, isMondayNine, normalizeCommentary, WeeklyReportService } from './weekly-report.service';

describe('weekly report', () => {
  it('covers the previous simulation week, Monday to Monday', () => {
    const { start, end } = reportWeek(new Date(2026, 8, 28, 9, 15)); // Mon 28 Sep 09:15
    expect(start).toEqual(new Date(2026, 8, 21));
    expect(end).toEqual(new Date(2026, 8, 28));
    expect(isMondayNine(new Date(2026, 8, 28, 9, 59))).toBe(true);
    expect(isMondayNine(new Date(2026, 8, 29, 9, 0))).toBe(false);
  });

  it('falls back to the template when the model output is unusable', () => {
    const fb = { challenge: 'fallback challenge', commentary: 'fallback commentary' };
    expect(normalizeCommentary(null, fb)).toEqual({ biggestChallenge: 'fallback challenge', ceoCommentary: 'fallback commentary' });
    expect(normalizeCommentary({ biggestChallenge: 'Slow replies', ceoCommentary: 'too short' }, fb).ceoCommentary).toBe('fallback commentary');
  });

  it('does not regenerate or re-send a week that already has a report', async () => {
    const existing = { id: 'wr1' };
    const prisma: any = { weeklyReport: { findUnique: jest.fn(async () => existing), create: jest.fn() } };
    const realtime: any = { broadcastToUser: jest.fn() };
    const svc = new WeeklyReportService(prisma, realtime);
    expect(await svc.generateAndSend('c1', 'ceo', new Date(2026, 8, 28, 9))).toBe(existing);
    expect(prisma.weeklyReport.create).not.toHaveBeenCalled();
    expect(realtime.broadcastToUser).not.toHaveBeenCalled();
  });
});
