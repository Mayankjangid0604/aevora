import * as crypto from 'crypto';
import { normalizeScope, projectTypeFromNeeds } from './scope.service';
import { extractHtml } from './delivery-agent.worker';
import { verifyRazorpaySignature } from './invoice-payment.service';

describe('delivery', () => {
  it('scope prices in integer paise with fallbacks and a floor', () => {
    expect(normalizeScope({ recommendedPriceInr: 15000.6, estimatedHours: 10 }, null).pricePaise).toBe(1500100);
    expect(normalizeScope({ recommendedPriceInr: 'abc' }, 8000).pricePaise).toBe(800000);
    expect(normalizeScope({ recommendedPriceInr: 5 }, null).pricePaise).toBe(100000);
    expect(normalizeScope(null, null).estimatedHours).toBe(8);
  });

  it('picks project type from needs', () => {
    expect(projectTypeFromNeeds({ needsAutomation: true, needsWebsite: true })).toBe('WEBSITE');
    expect(projectTypeFromNeeds({ needsSaaS: true })).toBe('SAAS');
  });

  it('extracts html from fenced model output', () => {
    expect(extractHtml('Sure!\n```html\n<!DOCTYPE html><html>x</html>\n```')).toBe('<!DOCTYPE html><html>x</html>');
    expect(extractHtml('hello')).toContain('<body>hello</body>');
  });

  it('verifies razorpay signatures', () => {
    const body = '{"event":"payment_link.paid"}';
    const sig = crypto.createHmac('sha256', 's3cret').update(body).digest('hex');
    expect(verifyRazorpaySignature(body, sig, 's3cret')).toBe(true);
    expect(verifyRazorpaySignature(body, sig, 'wrong')).toBe(false);
    expect(verifyRazorpaySignature(body, undefined, 's3cret')).toBe(false);
  });
});
