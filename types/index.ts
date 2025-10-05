// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  permissions: string[];
  role: 'tenant' | 'owner' | 'admin';
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Listing Types
export interface ListingType {
  id: string;
  image: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  rooms: number;
  size: number;
  price: number;
}

// Chat Types
export interface ChatItem {
  id: string;
  name: string;
  message: string;
  time: string;
  unreadCount?: number;
  avatar: string;
  read: boolean;
}

// Form Types
export interface PriceRange {
  min: number;
  max: number;
}

export interface ButtonOption {
  id: string;
  label: string;
}

// Permission Types
export interface PermissionContextType {
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
  hasPermission: (permission: string) => boolean;
}

// Property Types
export * from './property';

// DB Models
export interface DbUserRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  role: 'tenant' | 'owner';
  createdAt: string;
}

export interface TenantProfileRecord {
  userId: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  address: string;
  preferences?: {
    budget?: {
      min: number;
      max: number;
    };
    location?: string[];
    amenities?: string[];
  };
  createdAt: string;
}

export interface OwnerProfileRecord {
  userId: string;
  businessName?: string;
  contactNumber: string;
  email: string;
  createdAt: string;
}

export interface OwnerVerificationRecord {
  userId: string;
  govIdUri: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface ListingDraftRecord {
  id: string;
  userId: string;
  propertyType: string;
  address: string;
  monthlyRate: number;
  dailyRate: number;
  amenities: string[];
  photos: string[];
  createdAt: string;
}

export interface PaymentProfileRecord {
  userId: string;
  methods: string[];
  createdAt: string;
}

// Chat Models
export interface ConversationRecord {
  id: string;
  ownerId: string;
  tenantId: string;
  participantIds: string[];
  lastMessageText?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

// User Profile Photo Models
export interface UserProfilePhotoRecord {
  id: string;
  userId: string;
  photoUri: string;
  photoData?: string; // Base64 encoded image data for persistence
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedListingRecord {
  id: string;
  userId: string;
  propertyType: string;
  rentalType: string;
  address: string;
  monthlyRent: number;
  amenities: string[];
  rules: string[];
  photos: string[];
  videos: string[];
  coverPhoto: string | null;
  securityDeposit: number;
  paymentMethods: string[];
  ownerName: string;
  businessName: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
  availabilityStatus: string;
  leaseTerm: string;
  status: 'published';
  publishedAt: string;
}

export interface PropertyPhotoRecord {
  id: string;
  listingId: string;
  userId: string;
  photoUri: string;
  photoData?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isCoverPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}
