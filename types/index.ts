// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  permissions: string[];
  role: 'tenant' | 'owner' | 'admin' | 'brgy_official';
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
  role: 'tenant' | 'owner' | 'brgy_official';
  roles?: string[]; // Array format for AuthContext compatibility
  gender?: 'male' | 'female';
  familyType?: 'individual' | 'family';
  barangay?: string; // Barangay name for officials
  createdAt: string;
  updatedAt?: string; // Timestamp for when user was last updated
}

export interface TenantProfileRecord {
  userId: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  address: string;
  gender?: 'male' | 'female';
  familyType?: 'individual' | 'family';
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
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

export interface OwnerApplicationDocument {
  id: string;
  name: string; // Document name/type (e.g., "Government ID", "Business Permit", "Barangay Clearance")
  uri: string; // Document URI
  uploadedAt: string;
}

export interface OwnerApplicationRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  contactNumber: string;
  houseNumber: string;
  street: string;
  barangay: string;
  govIdUri: string | null; // Deprecated - kept for backward compatibility
  documents?: OwnerApplicationDocument[]; // New field for multiple documents (optional for backward compatibility)
  status: 'pending' | 'approved' | 'rejected';
  reason?: string; // Rejection reason
  createdBy: string; // User ID who created the application
  reviewedBy?: string; // Barangay official who reviewed
  createdAt: string;
  reviewedAt?: string;
  reapplicationRequested?: boolean; // Flag to indicate barangay requested owner to reapply/edit credentials
  reapplicationRequestedAt?: string; // When reapplication was requested
  reapplicationRequestedBy?: string; // Barangay official who requested reapplication
}

export interface BrgyNotificationRecord {
  id: string;
  barangay: string;
  type: 'owner_application';
  ownerApplicationId: string;
  ownerName: string;
  isRead: boolean;
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
  // Property information
  propertyId?: string;
  propertyTitle?: string;
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
  property_id?: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
  // Message type to distinguish from revenue-generating actions
  type: 'message' | 'inquiry' | 'booking_request' | 'image' | 'notification';
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
  barangay?: string; // Barangay where the property is located
  rooms: number;
  bathrooms: number;
  monthlyRent: number;
  amenities: string[];
  rules: string[];
  photos: string[];
  videos: string[];
  coverPhoto: string | null;
  securityDeposit: number; // Deprecated - use advanceDepositMonths instead
  advanceDepositMonths?: number; // Optional: Number of months for advance deposit (e.g., 3 months)
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
  // Additional properties used in the app
  title?: string;
  location?: string;
  description?: string;
  rooms?: number;
  size?: number;
  price?: number;
  ownerUserId?: string;
  capacity?: number; // Maximum number of tenants/slots
  roomCapacities?: number[]; // Capacity per room
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
  securityDeposit: number; // Deprecated - use advanceDepositMonths instead
  advanceDepositMonths?: number; // Number of months paid in advance (e.g., 3 months)
  remainingAdvanceMonths?: number; // Remaining advance months that can be used if tenant leaves early
  totalAmount: number;
  startDate: string;
  endDate: string;
  duration: number; // in months
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAddress?: string;
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
  selectedRoom?: number; // Room index (0-based) that the tenant selected
  tenantType?: 'individual' | 'family' | 'couple' | 'group';
  numberOfPeople?: number; // Number of people for family or group bookings
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  deletedAt?: string; // Timestamp when booking was soft-deleted (for analytics preservation)
  isDeleted?: boolean; // Flag to mark booking as deleted (for quick filtering)
  // Notification tracking
  notificationViewedByTenant?: boolean;
  notificationViewedAt?: string;
  // Termination tracking for advance deposit countdown
  terminationInitiatedAt?: string; // When tenant initiated ending rental stay
  terminationEndDate?: string; // Calculated end date based on remaining advance months
  terminationMode?: 'countdown' | 'immediate'; // How tenant wants to leave
}

export interface PaymentAccount {
  id: string;
  ownerId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer' | 'cash';
  accountName: string;
  accountNumber: string;
  accountDetails: string;
  qrCodeImageUri?: string; // QR code image URI for GCash payments
  qrCodeData?: string; // Parsed QR-PH code data string for accurate dynamic QR generation
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

// Property Rating Models
export interface PropertyRatingRecord {
  id: string;
  propertyId: string;
  userId: string; // Tenant who rated
  rating: number; // 1-5 stars
  review?: string; // Optional text review
  isAnonymous?: boolean; // Whether the rating is anonymous
  ownerReply?: string; // Owner's reply to the rating
  ownerReplyAt?: string; // When the owner replied
  createdAt: string;
  updatedAt: string;
}

// Rent Payment Models
export interface RentPaymentRecord {
  id: string;
  bookingId: string;
  tenantId: string;
  ownerId: string;
  propertyId: string;
  amount: number;
  lateFee: number;
  totalAmount: number;
  paymentMonth: string; // YYYY-MM format
  dueDate: string; // ISO date string
  paidDate?: string; // ISO date string
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'pending_owner_confirmation' | 'rejected';
  paymentMethod?: string;
  receiptNumber: string;
  notes?: string;
  ownerPaymentAccountId?: string; // Link to owner's payment account used for this payment
  // Paymongo integration fields
  paymongoPaymentIntentId?: string; // Paymongo payment intent ID
  paymongoPaymentId?: string; // Paymongo payment ID after successful payment
  paymongoStatus?: 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'awaiting_payment' | 'canceled' | 'failed';
  // Backup fields for restoring rejected payments
  rejectedAt?: string; // When payment was rejected
  rejectedBy?: string; // Owner ID who rejected
  originalPaidDate?: string; // Original paid date before rejection
  originalPaymentMethod?: string; // Original payment method before rejection
  originalStatus?: string; // Original status before rejection (pending_owner_confirmation or paid)
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReminderRecord {
  id: string;
  bookingId: string;
  tenantId: string;
  type: 'upcoming' | 'overdue' | 'late_fee';
  message: string;
  dueDate: string;
  amount: number;
  isRead: boolean;
  createdAt: string;
}

// Maintenance Request Models
export interface MaintenanceRequestRecord {
  id: string;
  bookingId: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'appliance' | 'heating_cooling' | 'structural' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
  photos: string[]; // Array of photo URIs
  videos: string[]; // Array of video URIs
  ownerNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment Method Types
export interface TenantPaymentMethod {
  id: string;
  tenantId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer';
  accountName: string;
  accountNumber: string;
  bankName?: string; // For bank transfers
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tenant Complaint Models
export interface TenantComplaintRecord {
  id: string;
  tenantId: string;
  propertyId: string;
  bookingId?: string; // Optional: link to booking if tenant has active booking
  category: 'noise_complaint' | 'landlord_abuse' | 'unsanitary_conditions' | 'illegal_activities' | 'maintenance_neglect' | 'payment_dispute' | 'safety_concern' | 'neighbor_conflict';
  description: string;
  photos: string[]; // Array of photo URIs
  videos: string[]; // Array of video URIs
  isAnonymous: boolean;
  status: 'submitted' | 'received_by_brgy' | 'under_review' | 'for_mediation' | 'resolved' | 'closed';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  barangayNotes?: string; // Notes added by barangay officials
  settlementDocuments?: string[]; // Array of document URIs uploaded by barangay
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}
