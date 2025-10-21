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
  bedrooms: number;
  bathrooms: number;
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
  roles?: string[]; // Array format for AuthContext compatibility
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
  // Unread message tracking
  unreadByOwner?: number;
  unreadByTenant?: number;
  lastReadByOwner?: string;
  lastReadByTenant?: string;
  // Legacy field support for backward compatibility
  owner_id?: string;
  tenant_id?: string;
  participant_ids?: string[];
  last_message_text?: string;
  last_message_at?: string;
  created_at?: string;
  updated_at?: string;
  unread_by_owner?: number;
  unread_by_tenant?: number;
  last_read_by_owner?: string;
  last_read_by_tenant?: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
  // Message type to distinguish from revenue-generating actions
  type: 'message' | 'inquiry' | 'booking_request' | 'image';
  // Property reference for context
  propertyId?: string;
  propertyTitle?: string;
  // Image support
  imageUri?: string;
  imageWidth?: number;
  imageHeight?: number;
  // Legacy field support for backward compatibility
  conversation_id?: string;
  sender_id?: string;
  created_at?: string;
  read_by?: string[];
  property_id?: string;
  property_title?: string;
  image_uri?: string;
  image_width?: number;
  image_height?: number;
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
  bedrooms: number;
  bathrooms: number;
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

export interface PropertyVideoRecord {
  id: string;
  listingId: string;
  userId: string;
  videoUri: string;
  videoData?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  thumbnailUri?: string;
  createdAt: string;
  updatedAt: string;
}

// Booking Models
export interface BookingRecord {
  id: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  propertyTitle: string;
  propertyAddress: string;
  monthlyRent: number;
  securityDeposit: number;
  totalAmount: number;
  startDate: string;
  endDate: string;
  duration: number; // in months
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  specialRequests?: string;
  selectedPaymentMethod?: string;
  paymentMethodDetails?: {
    type: string;
    accountName: string;
    accountNumber: string;
    accountDetails?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  // Notification tracking
  notificationViewedByTenant?: boolean;
  notificationViewedAt?: string;
}

export interface PaymentAccount {
  id: string;
  ownerId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer' | 'cash';
  accountName: string;
  accountNumber: string;
  accountDetails: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteRecord {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}
