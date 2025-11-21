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
  rooms: number;
  bathrooms: number;
  amenities: string[];
  rules: string[];
  
  // Media
  photos: string[];
  videos: string[];
  coverPhoto: string | null;
  
  // Pricing & Payment
  securityDeposit: number; // Deprecated - use advanceDepositMonths instead
  advanceDepositMonths?: number; // Optional: Number of months for advance deposit
  paymentMethods: string[];
  
  // Contact & Owner
  ownerName: string;
  businessName: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
  
  // Status
  status: 'published';
  publishedAt: string | null;
  
  // Additional fields for tracking
  views?: number;
  inquiries?: number;
  createdAt?: string;
  updatedAt?: string;
  capacity?: number; // Maximum number of tenants/slots
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
  rooms: number;
  bathrooms: number;
  amenities: string[];
  rules: string[];
}

export interface MediaData {
  photos: string[];
  videos: string[];
  coverPhoto: string | null;
}

export interface PricingPaymentData {
  securityDeposit: number; // Deprecated - use advanceDepositMonths instead
  advanceDepositMonths?: number; // Optional: Number of months for advance deposit
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
  'Boarding House',
  'Bedspace'
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
