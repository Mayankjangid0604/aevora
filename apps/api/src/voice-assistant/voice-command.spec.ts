import { normalizeIntent } from './voice-command.service';

describe('voice intent normalization', () => {
  it('keeps known intents and fills defaults', () => {
    const i = normalizeIntent({ intent: 'CHECK_REVENUE', target: 'FINANCE', naturalLanguageReply: 'Checking.' }, 'how much money');
    expect(i).toEqual({ intent: 'CHECK_REVENUE', target: 'FINANCE', parameters: {}, naturalLanguageReply: 'Checking.' });
  });

  it('falls back to CUSTOM on unknown or missing model output', () => {
    expect(normalizeIntent({ intent: 'DROP_TABLES' }, 'x').intent).toBe('CUSTOM');
    const i = normalizeIntent(null, 'do the thing');
    expect(i.intent).toBe('CUSTOM');
    expect(i.naturalLanguageReply).toContain('do the thing');
  });
});
