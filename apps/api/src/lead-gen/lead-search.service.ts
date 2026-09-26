import { Injectable, Logger } from '@nestjs/common';

export interface LeadSearchQuery {
  category: string;
  location: string;
  radius?: number;
  maxResults?: number;
  variant?: string; // query prefix, e.g. "best" — lets a high-weight category search twice without repeating itself
}

export interface FoundLead {
  googlePlaceId: string;
  businessName: string;
  category: string;
  location: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  reviewCount: number;
  lat?: number; // Google Places coordinates (absent for mock leads)
  lng?: number;
  qualityScore: number;
}

/** 0–100. No website is the strongest signal: that is what we sell. */
export function scoreLead(l: { phone: string | null; email: string | null; website: string | null; reviewCount: number }): number {
  let score = 0;
  if (l.phone) score += 25;
  if (l.email) score += 25;
  if (!l.website) score += 30;
  score += Math.min(20, Math.floor(l.reviewCount / 10)); // reviews ≈ business size
  return Math.min(100, score);
}

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.websiteUri',
  'places.nationalPhoneNumber', 'places.userRatingCount', 'places.editorialSummary', 'places.location',
].join(',');

@Injectable()
export class LeadSearchService {
  private readonly logger = new Logger(LeadSearchService.name);

  private get enabled() {
    return process.env.LEAD_GEN_PROVIDER_ENABLED === 'true' && !!process.env.GOOGLE_PLACES_API_KEY;
  }

  async search(q: LeadSearchQuery, knownPlaceIds: Set<string> = new Set()): Promise<FoundLead[]> {
    const max = Math.min(q.maxResults ?? 20, 20); // Places API page cap
    if (!this.enabled) {
      this.logger.warn('Lead gen provider disabled (LEAD_GEN_PROVIDER_ENABLED!=true or no GOOGLE_PLACES_API_KEY) — returning mock leads');
      return this.mock(q, max).filter((l) => !knownPlaceIds.has(l.googlePlaceId));
    }

    const body: any = { textQuery: `${q.variant ? `${q.variant} ` : ''}${q.category} in ${q.location}`, maxResultCount: max };
    if (q.radius) {
      const center = await this.places({ textQuery: q.location, maxResultCount: 1 });
      const loc = center[0]?.location;
      if (loc) body.locationBias = { circle: { center: loc, radius: Math.min(q.radius, 50000) } };
    }

    const results: FoundLead[] = [];
    for (const p of await this.places(body)) {
      if (knownPlaceIds.has(p.id)) continue;
      const website: string | null = p.websiteUri ?? null;
      const lead = {
        googlePlaceId: p.id,
        businessName: p.displayName?.text ?? 'Unknown',
        category: q.category,
        location: p.formattedAddress ?? q.location,
        website,
        email: website ? await this.scrapeEmail(website) : null,
        phone: p.nationalPhoneNumber ?? null,
        description: p.editorialSummary?.text ?? null,
        reviewCount: p.userRatingCount ?? 0,
        lat: p.location?.latitude,
        lng: p.location?.longitude,
      };
      results.push({ ...lead, qualityScore: scoreLead(lead) });
    }
    return results;
  }

  private async places(body: any): Promise<any[]> {
    const res = await fetch(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
    return (await res.json()).places ?? [];
  }

  private async scrapeEmail(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const html = (await res.text()).slice(0, 500_000);
      const m = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(?!png|jpg|jpeg|gif|svg|webp)[A-Z]{2,}/i);
      return m ? m[0].toLowerCase() : null;
    } catch {
      return null;
    }
  }

  private mock(q: LeadSearchQuery, max: number): FoundLead[] {
    return Array.from({ length: Math.min(max, 5) }, (_, i) => {
      const lead = {
        googlePlaceId: `mock-${q.variant ? `${q.variant}-` : ''}${q.category}-${q.location}-${i}`.replace(/\s+/g, '_'),
        businessName: `${q.category[0].toUpperCase()}${q.category.slice(1)} ${['Palace', 'Corner', 'Hub', 'Point', 'Express'][i]}`,
        category: q.category,
        location: q.location,
        website: i % 2 ? `https://example.com/${q.category}-${i}` : null,
        email: i % 3 ? null : `owner${i}@example.com`,
        phone: `+91-90000000${i}${i}`,
        description: `Mock ${q.category} lead`,
        reviewCount: 20 * (i + 1),
      };
      return { ...lead, qualityScore: scoreLead(lead) };
    });
  }
}
