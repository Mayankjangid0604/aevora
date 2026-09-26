import { renderTemplate, templateVars, DEFAULT_EMAIL_SCRIPT } from './email-outreach.service';
import { normalizeNeeds } from './discovery.service';

describe('sales outreach', () => {
  it('renders template vars and blanks unknown ones', () => {
    const vars = templateVars({ name: 'Sharma Sweets', industry: 'restaurant' });
    expect(renderTemplate(DEFAULT_EMAIL_SCRIPT.subjectTemplate, vars)).toBe('Quick idea for Sharma Sweets');
    expect(renderTemplate('{{category}}|{{nope}}', vars)).toBe('restaurant|');
  });

  it('normalizes model output into safe needs', () => {
    expect(normalizeNeeds({ needsWebsite: 'yes', budget: '15000.4', timeline: 5 })).toEqual({
      needsWebsite: true, needsSaaS: false, needsAutomation: false, budget: 15000, timeline: null, description: '',
    });
    expect(normalizeNeeds(null).budget).toBeNull();
    expect(normalizeNeeds({ budget: -5 }).budget).toBeNull();
  });
});
