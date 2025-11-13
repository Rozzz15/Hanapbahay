import { BARANGAYS } from '@/constants/Barangays';
import { AMENITIES } from '@/types/property';

export type SmartSearchParams = {
  query?: string;
  location?: string; // barangay
  minPrice?: number;
  maxPrice?: number;
  rooms?: number; // 0 = any
  amenities?: string[];
  propertyType?: string;
  occupantType?: 'Family' | 'Individual';
};

export type ListingLike = {
  id: string;
  title?: string;
  location?: string;
  address?: string;
  description?: string;
  price?: number;
  rooms?: number;
  bathrooms?: number;
  propertyType?: string;
  barangay?: string;
  amenities?: string[];
};

export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs = 300) {
  let timer: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

export function parseIntent(input: string): Partial<SmartSearchParams> {
  if (!input) return {};
  const text = input.toLowerCase();
  const out: Partial<SmartSearchParams> = { query: input };

  // rooms: "2br", "2 bed", "2 bedrooms", "2 rooms"
  const brMatch = text.match(/(\d+)\s*(br|bed|bedroom|bedrooms|room|rooms)/);
  if (brMatch) out.rooms = parseInt(brMatch[1], 10);

  // price: numbers with k or plain numbers; assume PHP monthly
  // e.g., "under 10k", "<= 15000", "max 8k"
  const underMatch = text.match(/under\s*(\d+)\s*k?/);
  if (underMatch) out.maxPrice = parseInt(underMatch[1], 10) * (text.includes('k') ? 1000 : 1);

  const maxMatch = text.match(/(<=|less than|max)\s*(\d+)\s*k?/);
  if (maxMatch) out.maxPrice = parseInt(maxMatch[2], 10) * (text.includes('k') ? 1000 : 1);

  const betweenMatch = text.match(/(between|from)\s*(\d+)\s*k?\s*(and|to|-)\s*(\d+)\s*k?/);
  if (betweenMatch) {
    const a = parseInt(betweenMatch[2], 10) * (text.includes('k') ? 1000 : 1);
    const b = parseInt(betweenMatch[4], 10) * (text.includes('k') ? 1000 : 1);
    out.minPrice = Math.min(a, b);
    out.maxPrice = Math.max(a, b);
  }

  const exactNum = text.match(/\b(\d{4,6})\b/);
  if (exactNum && !out.maxPrice && !out.minPrice) {
    out.maxPrice = parseInt(exactNum[1], 10);
  }

  // location by barangay keyword
  const loc = BARANGAYS.find(b => text.includes(b.toLowerCase()));
  if (loc) out.location = loc;

  // amenity keywords
  const amenityHits = AMENITIES.filter(a => text.includes(a.toLowerCase()));
  if (amenityHits.length) out.amenities = amenityHits;

  return out;
}

export function scoreListing(listing: ListingLike, params: SmartSearchParams): number {
  let score = 0;
  const text = (
    (listing.title || '') + ' ' +
    (listing.location || '') + ' ' +
    (listing.address || '') + ' ' +
    (listing.description || '') + ' ' +
    (listing.propertyType || '')
  ).toLowerCase();

  if (params.query) {
    const q = params.query.toLowerCase();
    if (text.includes(q)) score += 3;
  }

  if (params.location) {
    const loc = params.location.toLowerCase();
    if ((listing.barangay || '').toLowerCase() === loc) score += 3;
    else if ((listing.location || '').toLowerCase().includes(loc)) score += 2;
    else if ((listing.address || '').toLowerCase().includes(loc)) score += 1;
  }

  if (typeof params.rooms === 'number' && params.rooms > 0) {
    if ((listing.rooms || 0) >= params.rooms) score += 2;
  }

  if (typeof params.minPrice === 'number' && typeof listing.price === 'number') {
    if (listing.price >= params.minPrice) score += 1;
  }
  if (typeof params.maxPrice === 'number' && typeof listing.price === 'number') {
    if (listing.price <= params.maxPrice) score += 1;
  }

  if (params.amenities && params.amenities.length > 0) {
    const listingAmenities = (listing.amenities || []).map(a => a.toLowerCase());
    const hits = params.amenities.filter(a => listingAmenities.includes(a.toLowerCase())).length;
    score += hits; // +1 per matched amenity
  }

  if (params.propertyType && listing.propertyType) {
    if (listing.propertyType.toLowerCase() === params.propertyType.toLowerCase()) score += 2;
  }

  return score;
}

export function filterListings<T extends ListingLike>(
  listings: T[],
  params: SmartSearchParams
): T[] {
  const { location, minPrice, maxPrice, rooms, amenities, query } = params;
  const { propertyType, occupantType } = params;
  const q = (query || '').toLowerCase().trim();

  const filtered = listings.filter(l => {
    if (location) {
      const loc = location.toLowerCase();
      const matchLoc =
        (l.barangay || '').toLowerCase() === loc ||
        (l.location || '').toLowerCase().includes(loc) ||
        (l.address || '').toLowerCase().includes(loc);
      if (!matchLoc) return false;
    }

    if (typeof minPrice === 'number' && typeof l.price === 'number' && l.price < minPrice) return false;
    if (typeof maxPrice === 'number' && typeof l.price === 'number' && l.price > maxPrice) return false;

    if (typeof rooms === 'number' && rooms > 0) {
      if ((l.rooms || 0) < rooms) return false;
    }

    if (amenities && amenities.length > 0) {
      const la = (l.amenities || []).map(a => a.toLowerCase());
      const allPresent = amenities.every(a => la.includes(a.toLowerCase()));
      if (!allPresent) return false;
    }

    if (propertyType) {
      if ((l.propertyType || '').toLowerCase() !== propertyType.toLowerCase()) return false;
    }

    if (occupantType) {
      // Map occupant type to rentalType heuristic
      const rentalType = ((l as any).rentalType || '').toLowerCase();
      if (occupantType === 'Family') {
        // prefer whole unit
        if (rentalType && rentalType !== 'whole unit') return false;
      } else if (occupantType === 'Individual') {
        if (rentalType && rentalType === 'whole unit') return false;
      }
    }

    if (q) {
      const hay = (
        (l.title || '') + ' ' + (l.location || '') + ' ' + (l.address || '') + ' ' + (l.description || '')
      ).toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  // rank with score desc
  return filtered
    .map(l => ({ l, s: scoreListing(l, params) }))
    .sort((a, b) => b.s - a.s)
    .map(({ l }) => l);
}

export type Suggestion = {
  type: 'location' | 'amenity' | 'recent' | 'popular';
  value: string;
  label: string;
};

export function suggestTerms(input: string, recent: string[] = [], popular: string[] = []): Suggestion[] {
  const q = (input || '').toLowerCase();
  const suggestions: Suggestion[] = [];

  // locations
  BARANGAYS.forEach(b => {
    if (!q || b.toLowerCase().includes(q)) {
      suggestions.push({ type: 'location', value: b, label: b });
    }
  });

  // amenities
  AMENITIES.forEach(a => {
    if (!q || a.toLowerCase().includes(q)) {
      suggestions.push({ type: 'amenity', value: a, label: a });
    }
  });

  // recent first
  recent.slice(0, 6).forEach(r => suggestions.unshift({ type: 'recent', value: r, label: r }));

  // popular
  popular.slice(0, 6).forEach(p => suggestions.push({ type: 'popular', value: p, label: p }));

  // dedupe by label
  const seen = new Set<string>();
  return suggestions.filter(s => (seen.has(s.label) ? false : (seen.add(s.label), true)));
}


