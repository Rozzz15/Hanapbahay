import { db, generateId } from './db';
import { PublishedListingRecord, ConversationRecord, MessageRecord, DbUserRecord, OwnerProfileRecord, TenantProfileRecord } from '../types';

// Lazy-load supabase client to avoid Metro bundling issues
// Create a mock supabase client that's always available
const createMockSupabase = () => ({
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
});

// Lazy-load supabase client only when needed (not at module load time)
let supabaseCache: any = null;
const getSupabase = async () => {
  if (supabaseCache) {
    return supabaseCache;
  }
  
  try {
    if (typeof window !== 'undefined') {
      // Web environment - use mock
      supabaseCache = createMockSupabase();
    } else {
      // Mobile environment - try to use real Supabase (lazy import)
      const supabaseClient = await import('./supabase-client');
      supabaseCache = supabaseClient.supabase || supabaseClient.default || createMockSupabase();
    }
  } catch (error) {
    // Fallback to mock if import fails
    supabaseCache = createMockSupabase();
  }
  
  return supabaseCache;
};

// For synchronous access, use mock (most functions don't actually use supabase)
const supabase = createMockSupabase();

// Owner Dashboard Database Operations

export interface OwnerDashboardStats {
  totalListings: number;
  totalViews: number;
  monthlyRevenue: number;
  totalBookings: number;
}

export interface OwnerListing {
  id: string;
  userId: string;
  propertyType: string;
  address: string;
  monthlyRent: number;
  status: string;
  views: number;
  inquiries: number;
  createdAt: string;
  updatedAt: string;
  coverPhoto?: string;
  photos?: string[];
  videos?: string[];
  // Additional fields for enhanced display
  businessName?: string;
  rooms?: number;
  bathrooms?: number;
  size?: number;
  rentalType?: string;
  availabilityStatus?: string;
  leaseTerm?: string;
  baseRent?: number;
  securityDeposit?: number;
  ownerName?: string;
  contactNumber?: string;
  email?: string;
  emergencyContact?: string;
  amenities?: string[];
  description?: string;
  capacity?: number; // Maximum number of tenants/slots
  occupiedSlots?: number; // Current number of occupied slots
  roomCapacities?: number[]; // Capacity per room
}

export interface OwnerBooking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  monthlyRent: number;
  totalAmount: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

export interface OwnerMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  propertyId?: string;
  propertyTitle?: string;
  tenantName?: string;
  isRead: boolean;
}

export interface PaymentAccount {
  id: string;
  ownerId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer' | 'cash';
  accountName: string;
  accountNumber: string;
  accountDetails: string;
  qrCodeImageUri?: string; // QR code image URI for GCash payments
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Dashboard Stats
export async function getOwnerDashboardStats(ownerId: string): Promise<OwnerDashboardStats> {
  try {
    // Get from local database instead of Supabase
    const { db } = await import('./db');
    
    // Get all listings for this owner
    const allListings = await db.list<any>('published_listings');
    const ownerListings = allListings.filter(listing => listing.userId === ownerId);
    
    const totalListings = ownerListings.length;
    const totalViews = ownerListings.reduce((sum, listing) => sum + (listing.views || 0), 0);
    
    // Get total bookings for this owner (all statuses)
    const allBookingsData = await db.list<any>('bookings');
    const ownerBookings = allBookingsData.filter(booking => booking.ownerId === ownerId);
    const totalBookings = ownerBookings.length;

    // Get monthly revenue from:
    // 1. Approved bookings with PAID status (initial deposits) created this month
    // 2. Rent payments with PAID status (monthly payments) paid this month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Calculate revenue from booking deposits (initial payments) created this month
    const paidOwnerBookings = allBookingsData.filter(booking => 
      booking.ownerId === ownerId && 
      booking.status === 'approved' &&
      booking.paymentStatus === 'paid' && // ONLY count paid bookings in revenue
      booking.createdAt && 
      booking.createdAt.startsWith(currentMonth)
    );
    const bookingDepositRevenue = paidOwnerBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    
    // Calculate revenue from rent payments (monthly payments) paid this month
    const { getRentPaymentsByOwner } = await import('./tenant-payments');
    const allRentPayments = await getRentPaymentsByOwner(ownerId);
    const paidRentPayments = allRentPayments.filter(payment => {
      // Only include payments that are confirmed/accepted (status === 'paid')
      if (payment.status !== 'paid') return false;
      
      // Check if payment was paid in the current month
      // Use paidDate if available, otherwise fall back to createdAt
      const paidDate = payment.paidDate || payment.createdAt;
      
      // Include if paid this month (when the owner confirmed/accepted the payment)
      return paidDate.startsWith(currentMonth);
    });
    const rentPaymentRevenue = paidRentPayments.reduce((sum, payment) => sum + (payment.totalAmount || 0), 0);
    
    // Total monthly revenue = booking deposits + rent payments
    const monthlyRevenue = bookingDepositRevenue + rentPaymentRevenue;
    
    console.log('💰 Revenue calculation:', {
      totalBookings: allBookingsData.filter((b: any) => b.ownerId === ownerId && b.status === 'approved').length,
      paidBookings: paidOwnerBookings.length,
      bookingDepositRevenue,
      paidRentPayments: paidRentPayments.length,
      rentPaymentRevenue,
      monthlyRevenue
    });

    console.log(`📊 Dashboard stats for owner ${ownerId}:`, {
      totalListings,
      totalViews,
      totalBookings,
      monthlyRevenue,
      listingsCount: ownerListings.length
    });

    return {
      totalListings,
      totalViews,
      monthlyRevenue,
      totalBookings
    };
  } catch (error) {
    console.error('Error fetching owner dashboard stats:', error);
    return {
      totalListings: 0,
      totalViews: 0,
      monthlyRevenue: 0,
      totalBookings: 0
    };
  }
}

// Owner Listings
export async function getOwnerListings(ownerId: string): Promise<OwnerListing[]> {
  try {
    // Get from local database instead of Supabase
    const { db } = await import('./db');
    const { loadPropertyMedia } = await import('./media-storage');
    const allListings = await db.list<any>('published_listings');
    
    // Filter by owner ID and sort by creation date
    const filteredListings = allListings
      .filter(listing => listing.userId === ownerId)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Newest first
      });

    // Load media data for each listing - PRIORITIZE DATABASE LIKE TENANT PROFILE PICTURES
    const ownerListings = await Promise.all(filteredListings.map(async (listing) => {
      let coverPhoto = listing.coverPhoto;
      let photos = listing.photos || [];
      let videos = listing.videos || [];

      try {
        // CRITICAL: Load fresh media data from database FIRST (like tenant profile pictures)
        const media = await loadPropertyMedia(listing.id);
        
        // ALWAYS use database data if available (like tenant profile pictures)
        if (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) {
          console.log(`📸 Using database media for listing ${listing.id} (like tenant profile pictures):`, {
            hasCoverPhoto: !!media.coverPhoto,
            photosCount: media.photos.length,
            videosCount: media.videos.length
          });
          
          // Override with database data
          coverPhoto = media.coverPhoto;
          photos = media.photos;
          videos = media.videos;
        } else {
          console.log(`📸 No database media found for listing ${listing.id}, using listing data as fallback`);
        }
        
        console.log(`✅ Final media for listing ${listing.id}:`, {
          hasCoverPhoto: !!coverPhoto,
          photosCount: photos.length,
          videosCount: videos.length,
          source: (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) ? 'database' : 'listing'
        });
      } catch (mediaError) {
        console.log(`⚠️ Could not load media for listing ${listing.id}:`, mediaError);
        // Keep existing listing data as fallback
      }

      // Get capacity information
      let occupiedSlots = 0;
      try {
        const { getOccupiedSlots } = await import('./listing-capacity');
        occupiedSlots = await getOccupiedSlots(listing.id);
      } catch (capacityError) {
        console.log(`⚠️ Could not load capacity for listing ${listing.id}:`, capacityError);
      }

      return {
        id: listing.id,
        userId: listing.userId,
        propertyType: listing.propertyType,
        address: listing.address,
        monthlyRent: listing.monthlyRent,
        status: listing.status,
        views: listing.views || 0,
        inquiries: listing.inquiries || 0,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        coverPhoto,
        photos,
        videos,
        // Additional fields for enhanced display
        businessName: listing.businessName,
        rooms: listing.rooms || listing.bedrooms,
        bathrooms: listing.bathrooms,
        size: listing.size,
        rentalType: listing.rentalType,
        availabilityStatus: listing.availabilityStatus,
        leaseTerm: listing.leaseTerm,
        baseRent: listing.baseRent,
        securityDeposit: listing.securityDeposit,
        ownerName: listing.ownerName,
        contactNumber: listing.contactNumber,
        email: listing.email,
        emergencyContact: listing.emergencyContact,
        amenities: listing.amenities,
        description: listing.description,
        capacity: listing.capacity,
        occupiedSlots: occupiedSlots,
        roomCapacities: listing.roomCapacities
      };
    }));

    console.log(`✅ Loaded ${ownerListings.length} listings with media for owner ${ownerId}`);
    return ownerListings;
  } catch (error) {
    console.error('Error fetching owner listings:', error);
    return [];
  }
}

export async function createOwnerListing(ownerId: string, listingData: any): Promise<OwnerListing | null> {
  try {
    const { data, error } = await supabase
      .from('published_listings')
      .insert([{
        ...listingData,
        userId: ownerId,
        status: 'published',
        publishedAt: new Date().toISOString(),
        views: 0,
        inquiries: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating owner listing:', error);
    return null;
  }
}

export async function updateOwnerListing(ownerId: string, listingId: string, updateData: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('published_listings')
      .update({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .eq('id', listingId)
      .eq('userId', ownerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating owner listing:', error);
    return false;
  }
}

export async function deleteOwnerListing(ownerId: string, listingId: string): Promise<boolean> {
  try {
    // Get from local database and verify ownership
    const { db } = await import('./db');
    const listing = await db.get<any>('published_listings', listingId);
    
    if (!listing) {
      console.error('Listing not found');
      return false;
    }
    
    if (listing.userId !== ownerId) {
      console.error('Unauthorized: Listing does not belong to this owner');
      return false;
    }
    
    console.log(`🗑️ Starting deletion of listing ${listingId}...`);
    
    // Delete associated media first
    try {
      const { deletePropertyMedia } = await import('./media-storage');
      await deletePropertyMedia(listingId);
      console.log(`✅ Deleted media for listing ${listingId}`);
    } catch (mediaError) {
      console.warn('⚠️ Could not delete media for listing:', mediaError);
    }
    
    // Delete from local database
    await db.remove('published_listings', listingId);
    console.log(`✅ Deleted listing ${listingId} from database`);
    
    // Also remove from any other collections that might reference this listing
    try {
      // Remove from favorites
      const favorites = await db.list('user_favorites');
      for (const favorite of favorites) {
        if (favorite.propertyId === listingId) {
          await db.remove('user_favorites', favorite.id);
        }
      }
      
      // Remove from bookings
      const bookings = await db.list('bookings');
      for (const booking of bookings) {
        if (booking.propertyId === listingId) {
          await db.remove('bookings', booking.id);
        }
      }
      
      console.log(`✅ Cleaned up related data for listing ${listingId}`);
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up related data:', cleanupError);
    }
    
    // Dispatch event to notify other components with more details
    const { dispatchCustomEvent } = await import('./custom-events');
    dispatchCustomEvent('listingChanged', { 
      action: 'deleted', 
      listingId,
      ownerId,
      propertyType: listing.propertyType,
      address: listing.address,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Listing deletion completed and event dispatched for ${listingId}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting owner listing:', error);
    return false;
  }
}

// Owner Bookings
export async function getOwnerBookings(ownerId: string): Promise<OwnerBooking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('ownerId', ownerId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching owner bookings:', error);
    return [];
  }
}

export async function updateBookingStatus(
  ownerId: string, 
  bookingId: string, 
  status: 'approved' | 'rejected'
): Promise<boolean> {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (status === 'approved') {
      updateData.approvedAt = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date().toISOString();
    }

    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .eq('ownerId', ownerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating booking status:', error);
    return false;
  }
}

// Owner Messages
export async function getOwnerMessages(ownerId: string): Promise<OwnerMessage[]> {
  try {
    console.log('📥 Loading owner messages for:', ownerId);
    
    // Get all conversations
    const conversations = await db.list('conversations');
    console.log('💬 All conversations:', conversations.length);
    console.log('💬 Conversations data:', conversations);
    
    // Debug: Check if there are any conversations with old field names that need migration
    const needsMigration = conversations.some(conv => 
      (conv as any).owner_id || (conv as any).tenant_id || (conv as any).participant_ids
    );
    if (needsMigration) {
      console.log('🔄 Found conversations with old field names, attempting migration...');
      for (const conv of conversations) {
        if ((conv as any).owner_id || (conv as any).tenant_id || (conv as any).participant_ids) {
          const migratedConv = {
            id: conv.id,
            ownerId: (conv as any).owner_id || conv.ownerId || '',
            tenantId: (conv as any).tenant_id || conv.tenantId || '',
            participantIds: (conv as any).participant_ids || conv.participantIds || [],
            lastMessageText: (conv as any).last_message_text || conv.lastMessageText || conv.last_message_text,
            lastMessageAt: (conv as any).last_message_at || conv.lastMessageAt || conv.last_message_at,
            createdAt: (conv as any).created_at || conv.createdAt || conv.created_at || new Date().toISOString(),
            updatedAt: (conv as any).updated_at || conv.updatedAt || conv.updated_at || new Date().toISOString(),
            unreadByOwner: (conv as any).unread_by_owner || conv.unreadByOwner || conv.unread_by_owner || 0,
            unreadByTenant: (conv as any).unread_by_tenant || conv.unreadByTenant || conv.unread_by_tenant || 0,
            lastReadByOwner: (conv as any).last_read_by_owner || conv.lastReadByOwner || conv.last_read_by_owner,
            lastReadByTenant: (conv as any).last_read_by_tenant || conv.lastReadByTenant || conv.last_read_by_tenant,
          };
          await db.upsert('conversations', conv.id, migratedConv);
          console.log('✅ Migrated conversation:', conv.id);
        }
      }
      // Reload conversations after migration
      const updatedConversations = await db.list('conversations');
      console.log('🔄 Reloaded conversations after migration:', updatedConversations.length);
    }
    
    // Normalize conversations and filter where this user is the owner
    const finalConversations = needsMigration ? await db.list('conversations') : conversations;
    const normalizedConvs = finalConversations.map(conv => ({
      id: conv.id,
      ownerId: conv.ownerId || conv.owner_id || '',
      tenantId: conv.tenantId || conv.tenant_id || '',
      participantIds: conv.participantIds || conv.participant_ids || [],
      lastMessageText: conv.lastMessageText || conv.last_message_text,
      lastMessageAt: conv.lastMessageAt || conv.last_message_at,
      createdAt: conv.createdAt || conv.created_at || new Date().toISOString(),
      updatedAt: conv.updatedAt || conv.updated_at || new Date().toISOString(),
      unreadByOwner: conv.unreadByOwner || conv.unread_by_owner || 0,
      unreadByTenant: conv.unreadByTenant || conv.unread_by_tenant || 0,
      lastReadByOwner: conv.lastReadByOwner || conv.last_read_by_owner,
      lastReadByTenant: conv.lastReadByTenant || conv.last_read_by_tenant,
    }));
    
    // Improved filtering to catch conversations where ownerId matches or participantIds includes ownerId
    const ownerConversations = normalizedConvs.filter(conv => {
      const isOwner = conv.ownerId === ownerId;
      const isTenant = conv.tenantId === ownerId;
      const isParticipant = conv.participantIds && conv.participantIds.includes(ownerId);
      const matches = isOwner || isTenant || isParticipant;
      
      console.log('🔍 Conversation filter check:', {
        convId: conv.id,
        convOwnerId: conv.ownerId,
        convTenantId: conv.tenantId,
        targetOwnerId: ownerId,
        participantIds: conv.participantIds,
        isOwner,
        isTenant,
        isParticipant,
        matches,
        lastMessageText: conv.lastMessageText,
        lastMessageAt: conv.lastMessageAt
      });
      
      return matches;
    });
    console.log('💬 Found owner conversations:', ownerConversations.length);
    console.log('💬 Owner conversations data:', ownerConversations);
    
    // Get all messages and normalize them
    const allMessages = await db.list('messages');
    console.log('📨 All messages:', allMessages.length);
    console.log('📨 Messages data:', allMessages);
    
    const normalizedMessages = allMessages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversationId || msg.conversation_id || '',
      senderId: msg.senderId || msg.sender_id || '',
      text: msg.text,
      createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
      readBy: msg.readBy || msg.read_by || [],
      type: msg.type || 'message',
      propertyId: msg.propertyId || msg.property_id,
      propertyTitle: msg.propertyTitle || msg.property_title,
      imageUri: msg.imageUri || msg.image_uri,
      imageWidth: msg.imageWidth || msg.image_width,
      imageHeight: msg.imageHeight || msg.image_height,
    }));
    
    // Get all users to resolve tenant names
    const allUsers = await db.list('users');
    console.log('👥 All users:', allUsers.length);
    
    const ownerMessages: OwnerMessage[] = [];
    
    for (const conv of ownerConversations) {
      console.log('🔍 Processing conversation:', conv.id);
      // Filter out notifications - only get regular messages for conversation preview
      const convMessages = normalizedMessages
        .filter(msg => 
          msg.conversationId === conv.id && 
          msg.type !== 'notification' // Exclude notifications from conversation list
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log('📨 Messages for conversation', conv.id, ':', convMessages.length);
      
      if (convMessages.length > 0) {
        const latestMessage = convMessages[0];
        console.log('📨 Latest message:', latestMessage);
        
        // Get tenant name from users table
        // The tenant is the other participant (not the current owner)
        const otherParticipantId = conv.ownerId === ownerId ? conv.tenantId : conv.ownerId;
        const tenant = allUsers.find(u => u.id === otherParticipantId);
        const tenantName = tenant?.name || 'Tenant';
        console.log('👤 Tenant name for conversation', conv.id, ':', tenantName, '(other participant:', otherParticipantId, ')');
        
        ownerMessages.push({
          id: latestMessage.id,
          conversationId: conv.id,
          senderId: latestMessage.senderId,
          text: latestMessage.text,
          createdAt: latestMessage.createdAt,
          propertyId: latestMessage.propertyId || '',
          propertyTitle: latestMessage.propertyTitle || '',
          readBy: latestMessage.readBy || [],
          tenantName: tenantName,
          isRead: latestMessage.readBy?.includes(ownerId) || false
        });
      }
    }
    
    // Sort by creation time (newest first)
    ownerMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('📨 Final owner messages:', ownerMessages.length);
    console.log('📨 Final owner messages data:', ownerMessages);
    
    // Debug: If no messages found, let's check why
    if (ownerMessages.length === 0) {
      console.log('🔍 DEBUG: No owner messages found. Checking details...');
      console.log('🔍 DEBUG: Owner ID:', ownerId);
      console.log('🔍 DEBUG: Owner conversations found:', ownerConversations.length);
      console.log('🔍 DEBUG: All messages count:', normalizedMessages.length);
      
      // Check if there are any messages at all
      if (normalizedMessages.length > 0) {
        console.log('🔍 DEBUG: There are messages in the system, but none for this owner');
        console.log('🔍 DEBUG: Sample message:', normalizedMessages[0]);
      } else {
        console.log('🔍 DEBUG: No messages found in the system at all');
      }
      
      // Check if there are any conversations at all
      if (ownerConversations.length > 0) {
        console.log('🔍 DEBUG: Owner has conversations but no messages');
        console.log('🔍 DEBUG: Sample conversation:', ownerConversations[0]);
      } else {
        console.log('🔍 DEBUG: Owner has no conversations');
      }
    }
    
    return ownerMessages;
  } catch (error) {
    console.error('Error fetching owner messages:', error);
    return [];
  }
}

export async function sendOwnerMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<boolean> {
  try {
    console.log('📤 Sending owner message:', { conversationId, senderId, text });
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const messageData = {
      id: messageId,
      conversationId: conversationId,
      senderId: senderId,
      text: text.trim(),
      type: 'message',
      readBy: [senderId],
      createdAt: now,
      propertyId: '',
      propertyTitle: ''
    };

    // Save message to local database
    await db.upsert('messages', messageId, messageData);
    console.log('✅ Owner message saved to database');

    // Update conversation
    const conversation = await db.get('conversations', conversationId);
    if (conversation) {
      const normalizedConv = {
        id: conversation.id,
        ownerId: conversation.ownerId || conversation.owner_id || '',
        tenantId: conversation.tenantId || conversation.tenant_id || '',
        participantIds: conversation.participantIds || conversation.participant_ids || [],
        lastMessageText: conversation.lastMessageText || conversation.last_message_text,
        lastMessageAt: conversation.lastMessageAt || conversation.last_message_at,
        createdAt: conversation.createdAt || conversation.created_at || new Date().toISOString(),
        updatedAt: conversation.updatedAt || conversation.updated_at || new Date().toISOString(),
        unreadByOwner: conversation.unreadByOwner || conversation.unread_by_owner || 0,
        unreadByTenant: conversation.unreadByTenant || conversation.unread_by_tenant || 0,
        lastReadByOwner: conversation.lastReadByOwner || conversation.last_read_by_owner,
        lastReadByTenant: conversation.lastReadByTenant || conversation.last_read_by_tenant,
      };
      
      await db.upsert('conversations', conversationId, {
        ...normalizedConv,
        lastMessageText: text.trim(),
        lastMessageAt: now,
        unreadByTenant: (normalizedConv.unreadByTenant || 0) + 1,
        updatedAt: now
      });
    }

    return true;
  } catch (error) {
    console.error('Error sending owner message:', error);
    return false;
  }
}

// Payment Accounts
export async function getOwnerPaymentAccounts(ownerId: string): Promise<PaymentAccount[]> {
  try {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('ownerId', ownerId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching owner payment accounts:', error);
    return [];
  }
}

export async function createOwnerPaymentAccount(ownerId: string, accountData: any): Promise<PaymentAccount | null> {
  try {
    const { data, error } = await supabase
      .from('payment_accounts')
      .insert([{
        ...accountData,
        ownerId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating owner payment account:', error);
    return null;
  }
}

export async function updateOwnerPaymentAccount(
  ownerId: string, 
  accountId: string, 
  updateData: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_accounts')
      .update({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('ownerId', ownerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating owner payment account:', error);
    return false;
  }
}

export async function deleteOwnerPaymentAccount(ownerId: string, accountId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_accounts')
      .delete()
      .eq('id', accountId)
      .eq('ownerId', ownerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting owner payment account:', error);
    return false;
  }
}

// Check if owner has listings
export async function hasOwnerListings(ownerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('published_listings')
      .select('id')
      .eq('userId', ownerId)
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking owner listings:', error);
    return false;
  }
}

// Get owner's payment details for booking
export async function getOwnerPaymentDetails(ownerId: string): Promise<PaymentAccount[]> {
  try {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('ownerId', ownerId)
      .eq('isActive', true)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching owner payment details:', error);
    return [];
  }
}
