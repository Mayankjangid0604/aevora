import { detectSimpleIntent, normalizeAssistantIntent } from './assistant.service';

describe('normalizeAssistantIntent', () => {
  it('falls back to CUSTOM with the raw message as instruction on garbage', () => {
    const i = normalizeAssistantIntent(null, 'do something');
    expect(i.intent).toBe('CUSTOM');
    expect(i.parameters.instruction).toBe('do something');
  });
  it('rejects unknown intents', () => {
    expect(normalizeAssistantIntent({ intent: 'DELETE_EVERYTHING' }, 'x').intent).toBe('CUSTOM');
  });
  it('fills missing parameters from the message', () => {
    expect(normalizeAssistantIntent({ intent: 'NEW_VENTURE', parameters: {} }, 'food delivery in Sikar').parameters.idea).toBe('food delivery in Sikar');
    expect(normalizeAssistantIntent({ intent: 'ASK_CEO' }, 'what next?').parameters.question).toBe('what next?');
  });
  it('keeps a valid parsed intent', () => {
    const i = normalizeAssistantIntent({ intent: 'COMMAND_CEO', target: 'SALES', parameters: { instruction: 'focus on gyms' }, reply: 'OK' }, 'm');
    expect(i).toEqual({ intent: 'COMMAND_CEO', target: 'SALES', parameters: { instruction: 'focus on gyms' }, reply: 'OK' });
  });
});

describe('detectSimpleIntent', () => {
  const intentOf = (m: string) => detectSimpleIntent(m)?.intent ?? null;

  it('routes common commands without the model', () => {
    expect(intentOf('Status report')).toBe('STATUS_REPORT');
    expect(intentOf('status batao')).toBe('STATUS_REPORT');
    expect(intentOf('Check revenue')).toBe('CHECK_REVENUE');
    expect(intentOf('kitna paisa hai')).toBe('CHECK_REVENUE');
    expect(intentOf('Find new leads')).toBe('FIND_LEADS');
    expect(intentOf('Pause simulation')).toBe('PAUSE_SIMULATION');
    expect(intentOf('chalu karo')).toBe('RESUME_SIMULATION');
  });

  it('extracts the payload for CEO commands, questions and ideas', () => {
    expect(detectSimpleIntent('Tell CEO that we should target medical clinics in Sikar')).toMatchObject({ intent: 'COMMAND_CEO', parameters: { instruction: 'we should target medical clinics in Sikar' } });
    expect(detectSimpleIntent('Ask CEO: what is the biggest bottleneck?')).toMatchObject({ intent: 'ASK_CEO', parameters: { question: 'what is the biggest bottleneck?' } });
    expect(detectSimpleIntent('I have an idea: food delivery in Sikar')).toMatchObject({ intent: 'NEW_VENTURE', parameters: { idea: 'food delivery in Sikar' } });
  });

  it('never fires a side effect from a word inside a longer sentence', () => {
    expect(intentOf('Tell CEO not to pause outreach')).toBe('COMMAND_CEO');
    expect(intentOf('Tell CEO we need more money from clients')).toBe('COMMAND_CEO');
    expect(intentOf('start asking gyms for reviews')).toBeNull();
    expect(intentOf('we should pause cold calls for a week')).toBeNull();
    expect(intentOf('an idea for later maybe')).toBeNull();
  });

  it('leaves unusual commands to the model', () => {
    expect(intentOf('Send a WhatsApp to 9876543210 saying hi')).toBeNull();
  });
});

describe('detectSimpleIntent — marketing', () => {
  it('routes PIXEL commands and extracts the post topic', () => {
    expect(detectSimpleIntent('generate instagram post about automation for shops')).toMatchObject({ intent: 'GENERATE_POST', parameters: { topic: 'automation for shops' } });
    expect(detectSimpleIntent('generate post about revenue growth for gyms')).toMatchObject({ intent: 'GENERATE_POST', parameters: { topic: 'revenue growth for gyms' } });
    expect(detectSimpleIntent('post banao')?.intent).toBe('GENERATE_POST');
    expect(detectSimpleIntent('generate calendar')?.intent).toBe('GENERATE_CALENDAR');
    expect(detectSimpleIntent('week ka content')?.intent).toBe('GENERATE_CALENDAR');
    expect(detectSimpleIntent('WhatsApp broadcast bana do')?.intent).toBe('WHATSAPP_BROADCAST');
  });
  it('keeps CEO directives as directives', () => {
    expect(detectSimpleIntent('Tell CEO to generate post ideas for gyms')?.intent).toBe('COMMAND_CEO');
  });
});

describe('detectSimpleIntent — inbox', () => {
  it('routes inbox checks (English + Hinglish) ahead of status/revenue lookups', () => {
    for (const m of ['check inbox', 'check email', 'email dekho', 'koi reply aaya?', 'any replies', 'new emails']) {
      expect(detectSimpleIntent(m)?.intent).toBe('CHECK_INBOX');
    }
    expect(detectSimpleIntent('Tell CEO to check email replies daily')?.intent).toBe('COMMAND_CEO');
  });
});
