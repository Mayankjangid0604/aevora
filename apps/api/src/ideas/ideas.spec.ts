import { normalizeEvaluation } from './ideas.service';

describe('normalizeEvaluation', () => {
  it('approves on 7+ and builds the evaluation text', () => {
    const e = normalizeEvaluation({ score: 8, summary: 'Good fit.', strengths: ['demand'], risks: ['competition'], recommendation: 'APPROVE', estimatedBudget: 50000 });
    expect(e).toMatchObject({ score: 8, recommendation: 'APPROVE', estimatedBudget: 50000, question: null, rejectionReason: null });
    expect(e.evaluationText).toBe('Good fit.\nStrengths: demand\nRisks: competition');
  });

  it('lets the score, not a garbled recommendation, decide approve/reject', () => {
    expect(normalizeEvaluation({ score: 3, recommendation: 'APPROVE' }).recommendation).toBe('REJECT');
    expect(normalizeEvaluation({ score: 9, recommendation: 'MAYBE' }).recommendation).toBe('APPROVE');
    expect(normalizeEvaluation({ score: 5, recommendation: 'APPROVE' }).recommendation).toBe('NEED_INFO');
  });

  it('honours NEED_INFO and always has a question for it', () => {
    expect(normalizeEvaluation({ score: 8, recommendation: 'NEED_INFO', question: 'Budget?' })).toMatchObject({ recommendation: 'NEED_INFO', question: 'Budget?' });
    expect(normalizeEvaluation({ score: 6 }).question).toBeTruthy();
  });

  it('clamps garbage safely', () => {
    const e = normalizeEvaluation({ score: 'abc', estimatedBudget: 1e15 });
    expect(e.score).toBe(5);
    expect(e.estimatedBudget).toBe(2_147_483_647);
    expect(normalizeEvaluation({ score: 42 }).score).toBe(10);
    expect(normalizeEvaluation(null)).toMatchObject({ score: 5, recommendation: 'NEED_INFO' });
    expect(normalizeEvaluation({ score: 2 }).rejectionReason).toBe('Scored 2/10 by the CEO');
  });
});
