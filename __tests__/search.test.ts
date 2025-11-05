import { filterListings, scoreListing, SmartSearchParams } from '@/utils/search';

type TestListing = {
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
  rentalType?: string;
};

const listings: TestListing[] = [
  {
    id: 'a',
    title: 'Cozy Apartment in Talolong',
    address: 'Talolong, Lopez',
    location: 'Talolong',
    barangay: 'TALOLONG',
    price: 8000,
    rooms: 2,
    propertyType: 'Apartment',
    rentalType: 'Whole Unit',
  },
  {
    id: 'b',
    title: 'Bedspace near market',
    address: 'Rizal, Lopez',
    location: 'Rizal',
    barangay: 'RIZAL',
    price: 2500,
    rooms: 1,
    propertyType: 'Bedspace',
    rentalType: 'Per Bed',
  },
  {
    id: 'c',
    title: 'House with parking',
    address: 'Gomez, Lopez',
    location: 'Gomez',
    barangay: 'GOMEZ',
    price: 15000,
    rooms: 3,
    propertyType: 'House',
    rentalType: 'Whole Unit',
  },
  {
    id: 'd',
    title: 'Affordable room',
    address: 'Magsaysay, Lopez',
    location: 'Magsaysay',
    barangay: 'MAGSAYSAY',
    price: 4500,
    rooms: 1,
    propertyType: 'Apartment',
    rentalType: 'Per Room',
  },
];

describe('utils/search filterListings', () => {
  test('filters by barangay exactly', () => {
    const params: SmartSearchParams = { location: 'TALOLONG' };
    const result = filterListings(listings, params);
    expect(result.map(r => r.id)).toEqual(['a']);
  });

  test('filters by price range', () => {
    const params: SmartSearchParams = { minPrice: 3000, maxPrice: 10000 };
    const result = filterListings(listings, params);
    expect(result.map(r => r.id).sort()).toEqual(['a', 'd'].sort());
  });

  test('filters by property type', () => {
    const params: SmartSearchParams = { propertyType: 'House' };
    const result = filterListings(listings, params);
    expect(result.map(r => r.id)).toEqual(['c']);
  });

  test('occupantType Family prefers whole unit and excludes shared types', () => {
    const params: SmartSearchParams = { occupantType: 'Family' };
    const result = filterListings(listings, params);
    // Should include only whole unit listings (a, c)
    expect(result.map(r => r.id).sort()).toEqual(['a', 'c'].sort());
  });

  test('occupantType Individual excludes whole unit and keeps shared types', () => {
    const params: SmartSearchParams = { occupantType: 'Individual' };
    const result = filterListings(listings, params);
    // Should include per-room/bed (b, d)
    expect(result.map(r => r.id).sort()).toEqual(['b', 'd'].sort());
  });

  test('query matches title/description/address', () => {
    const params: SmartSearchParams = { query: 'parking' };
    const result = filterListings(listings, params);
    expect(result.map(r => r.id)).toEqual(['c']);
  });
});


