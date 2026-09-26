import { isoWeek, normalizeCalendar, normalizeHashtags } from './marketing-content.service';

describe('isoWeek', () => {
  it('uses ISO weeks and week-years', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ week: 1, year: 2026 }); // Thu
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ week: 53, year: 2026 }); // Fri → last week of 2026
    expect(isoWeek(new Date(2024, 11, 30))).toEqual({ week: 1, year: 2025 }); // Mon → first week of 2025
    expect(isoWeek(new Date(2026, 8, 28))).toEqual({ week: 40, year: 2026 });
  });
});

describe('normalizeHashtags', () => {
  it('adds #, strips spaces and junk, dedupes case-insensitively', () => {
    expect(normalizeHashtags(['Sikar', '#sikar', 'small business', '#Web-Design!', '', 5])).toEqual(['#Sikar', '#smallbusiness', '#WebDesign', '#5']);
    expect(normalizeHashtags('nope')).toEqual([]);
  });
});

describe('normalizeCalendar', () => {
  it('keeps at most 7 captioned days and fills gaps from the weekly plan', () => {
    const raw = { theme: 'Go digital', posts: [{ caption: 'a', contentType: 'BOGUS' }, { caption: '' }, ...Array.from({ length: 9 }, () => ({ caption: 'x', day: 'Friday', contentType: 'TIP_VALUE' }))] };
    const c = normalizeCalendar(raw, 40);
    expect(c.theme).toBe('Go digital');
    expect(c.posts).toHaveLength(7);
    expect(c.posts[0]).toMatchObject({ day: 'Monday', contentType: 'SERVICE_SHOWCASE' });
    expect(normalizeCalendar(null, 40)).toEqual({ theme: 'Week 40 content', posts: [] });
  });
});
