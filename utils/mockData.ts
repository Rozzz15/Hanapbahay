export interface PropertyType {
  id: string;
  label: string;
  value: string;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface PropertyFacility {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

export const propertyTypes: PropertyType[] = [
  { id: '1', label: 'Any', value: 'any' },
  { id: '2', label: 'House', value: 'house' },
  { id: '3', label: 'Apartment', value: 'apartment' },
  { id: '4', label: 'Condo', value: 'condo' },
  { id: '5', label: 'Bedspace', value: 'bedspace' },
];

export const propertyFacilities: PropertyFacility[] = [
  { id: '1', label: 'Any', value: 'any' },
  { id: '2', label: 'WiFi', value: 'wifi' },
  { id: '3', label: 'Self check-in', value: 'self-checkin' },
  { id: '4', label: 'Kitchen', value: 'kitchen' },
  { id: '5', label: 'Parking', value: 'parking' },
  { id: '6', label: 'Bathroom', value: 'bathroom' },
];

export const defaultPriceRange: PriceRange = {
  min: 1200,
  max: 3000,
};

export const defaultDateRange: DateRange = {
  startDate: '2024-02-25',
  endDate: '2024-03-27',
};

export const rentPeriods = [
  { id: '1', label: 'Any', value: 'any' },
  { id: '2', label: 'Monthly', value: 'monthly' },
  { id: '3', label: 'Annually', value: 'annually' },
]; 