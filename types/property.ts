export interface PropertyListing {
  // Basic Info
  id?: string;
  userId?: string;
  
  // Property Information
  propertyType: string;
  rentalType: string;
  monthlyRent: number;
  availabilityStatus: 'available' | 'occupied' | 'reserved';
  leaseTerm: 'short-term' | 'long-term' | 'negotiable';
  
  // Property Details
  address: string;
  amenities: string[];
  rules: string[];
  
  // Media
  photos: string[];
  videos: string[];
  coverPhoto: string | null;
  
  // Pricing & Payment
  baseRent: number;
  securityDeposit: number;
  paymentMethods: string[];
  
  // Contact & Owner
  ownerName: string;
  businessName: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
  
  // Status
  status: 'draft' | 'published';
  publishedAt: string | null;
  
  // Additional fields for tracking
  views?: number;
  inquiries?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyInfoData {
  propertyType: string;
  rentalType: string;
  monthlyRent: number;
  availabilityStatus: 'available' | 'occupied' | 'reserved';
  leaseTerm: 'short-term' | 'long-term' | 'negotiable';
}

export interface PropertyDetailsData {
  address: string;
  amenities: string[];
  rules: string[];
}

export interface MediaData {
  photos: string[];
  videos: string[];
  coverPhoto: string | null;
}

export interface PricingPaymentData {
  baseRent: number;
  securityDeposit: number;
  paymentMethods: string[];
}

export interface ContactOwnerData {
  ownerName: string;
  businessName: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
}

export const PROPERTY_TYPES = [
  'Apartment',
  'House',
  'Condo',
  'Bedspace',
  'Commercial Space',
  'Townhouse',
  'Studio',
  'Room for Rent'
];

export const RENTAL_TYPES = [
  'Whole Unit',
  'Per Room',
  'Per Bed',
  'Shared Space'
];

export const AMENITIES = [
  'WiFi',
  'Parking',
  'Air Conditioning',
  'Pet-friendly',
  'Balcony',
  'Security',
  'Laundry',
  'Kitchen',
  'Cable TV',
  'Bathroom',
  'Water Supply'
];

export const PAYMENT_METHODS = [
  'GCash',
  'Bank Transfer',
  'Cash'
];

export const LEASE_TERMS = [
  'Short-term (1-6 months)',
  'Long-term (6+ months)',
  'Negotiable'
];
