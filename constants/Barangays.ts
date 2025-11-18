// List of barangays in Dumaguete City
export const BARANGAYS = [
  'RIZAL',
  'TALOLONG', 
  'GOMEZ',
  'MAGSAYSAY',
  'BURGOS',
] as const;

export type Barangay = typeof BARANGAYS[number];

