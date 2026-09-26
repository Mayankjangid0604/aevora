import { normalizeClassification, precheck } from './inbound-message.service';

describe('precheck', () => {
  it('marks auto-replies as SPAM without the model', () => {
    expect(precheck('Automatic reply: On leave', 'I am away')?.intent).toBe('SPAM');
    expect(precheck('Re: website', 'thanks', { autoSubmitted: 'auto-replied' })?.intent).toBe('SPAM');
  });
  it('treats unsubscribe as NOT_INTERESTED so outreach stops', () => {
    expect(precheck('Re: offer', 'Please unsubscribe me')?.intent).toBe('NOT_INTERESTED');
  });
  it('does not call "is this spam?" spam, and leaves real replies to the model', () => {
    expect(precheck('Re: offer', 'Is this spam? What is the price?')).toBeNull();
    expect(precheck('Re: website', 'Haan interested hain, call karo')).toBeNull();
  });
  it('auto-submitted: no is a human reply', () => {
    expect(precheck('Re: website', 'ok tell me more', { autoSubmitted: 'no' })).toBeNull();
  });
});

describe('normalizeClassification', () => {
  it('keeps drafts only for questions and clamps confidence', () => {
    expect(normalizeClassification({ intent: 'ASKING_PRICE', confidence: 3, draftReply: ' Rs8000 se shuru ' })).toEqual({ intent: 'ASKING_PRICE', confidence: 1, feedback: null, draftReply: 'Rs8000 se shuru' });
    expect(normalizeClassification({ intent: 'INTERESTED', draftReply: 'x' }).draftReply).toBeNull();
  });
  it('maps garbage to UNKNOWN', () => {
    expect(normalizeClassification({ intent: 'MAYBE' })).toMatchObject({ intent: 'UNKNOWN', confidence: 0.5 });
    expect(normalizeClassification(null).intent).toBe('UNKNOWN');
  });
});
