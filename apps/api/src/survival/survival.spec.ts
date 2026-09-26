import { classifyBalance } from './survival.service';

describe('survival thresholds', () => {
  const MIN = 50_000; // ₹500
  const WARN = 200_000; // ₹2000
  it('classifies balances at the boundaries', () => {
    expect(classifyBalance(0, MIN, WARN)).toBe('SHUTDOWN');
    expect(classifyBalance(49_999, MIN, WARN)).toBe('SHUTDOWN');
    expect(classifyBalance(50_000, MIN, WARN)).toBe('CRITICAL');
    expect(classifyBalance(124_999, MIN, WARN)).toBe('CRITICAL');
    expect(classifyBalance(125_000, MIN, WARN)).toBe('WARNING');
    expect(classifyBalance(199_999, MIN, WARN)).toBe('WARNING');
    expect(classifyBalance(200_000, MIN, WARN)).toBe('HEALTHY');
  });
});
