import { db, generateId } from './db';
import { PropertyRatingRecord, PublishedListingRecord, MessageRecord, ConversationRecord } from '../types';
import { createOrFindConversation } from './conversation-utils';

/**
 * Get all ratings for a specific property
 */
export async function getPropertyRatings(propertyId: string): Promise<PropertyRatingRecord[]> {
  try {
    const allRatings = await db.list<PropertyRatingRecord>('property_ratings');
    return allRatings.filter(rating => rating.propertyId === propertyId);
  } catch (error) {
    console.error('❌ Error getting property ratings:', error);
    return [];
  }
}

/**
 * Get a user's rating for a specific property
 */
export async function getUserRatingForProperty(
  propertyId: string,
  userId: string
): Promise<PropertyRatingRecord | null> {
  try {
    const allRatings = await db.list<PropertyRatingRecord>('property_ratings');
    const userRating = allRatings.find(
      rating => rating.propertyId === propertyId && rating.userId === userId
    );
    return userRating || null;
  } catch (error) {
    console.error('❌ Error getting user rating:', error);
    return null;
  }
}

/**
 * Calculate average rating and review count for a property
 */
export async function calculatePropertyRating(propertyId: string): Promise<{
  averageRating: number;
  totalReviews: number;
}> {
  try {
    const ratings = await getPropertyRatings(propertyId);
    
    if (ratings.length === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }
    
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
    
    return {
      averageRating,
      totalReviews: ratings.length
    };
  } catch (error) {
    console.error('❌ Error calculating property rating:', error);
    return { averageRating: 0, totalReviews: 0 };
  }
}

/**
 * Submit or update a rating for a property
 */
export async function rateProperty(
  propertyId: string,
  userId: string,
  rating: number,
  review?: string,
  isAnonymous?: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      return { success: false, message: 'Rating must be between 1 and 5 stars' };
    }
    
    // Check if user already rated this property
    const existingRating = await getUserRatingForProperty(propertyId, userId);
    
    const now = new Date().toISOString();
    
    if (existingRating) {
      // Update existing rating
      const updatedRating: PropertyRatingRecord = {
        ...existingRating,
        rating,
        review,
        isAnonymous: isAnonymous ?? false,
        updatedAt: now
      };
      
      await db.upsert('property_ratings', existingRating.id, updatedRating);
      console.log('✅ Updated rating for property:', propertyId);
      return { success: true, message: 'Rating updated successfully!' };
    } else {
      // Create new rating
      const ratingId = generateId('rating');
      const newRating: PropertyRatingRecord = {
        id: ratingId,
        propertyId,
        userId,
        rating,
        review,
        isAnonymous: isAnonymous ?? false,
        createdAt: now,
        updatedAt: now
      };
      
      await db.upsert('property_ratings', ratingId, newRating);
      console.log('✅ Created new rating for property:', propertyId);
      
      // Send notification to owner about new rating
      try {
        await sendNewRatingNotification(newRating, propertyId);
      } catch (notifError) {
        console.error('⚠️ Failed to send rating notification, but rating was saved:', notifError);
      }
      
      return { success: true, message: 'Rating submitted successfully!' };
    }
  } catch (error) {
    console.error('❌ Error rating property:', error);
    return { success: false, message: 'Failed to submit rating. Please try again.' };
  }
}

/**
 * Delete a rating
 */
export async function deleteRating(ratingId: string): Promise<boolean> {
  try {
    await db.remove('property_ratings', ratingId);
    console.log('✅ Deleted rating:', ratingId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting rating:', error);
    return false;
  }
}

/**
 * Get all ratings with calculated averages for multiple properties
 */
export async function getPropertyRatingsMap(
  propertyIds: string[]
): Promise<Map<string, { averageRating: number; totalReviews: number }>> {
  const ratingsMap = new Map<string, { averageRating: number; totalReviews: number }>();
  
  try {
    await Promise.all(
      propertyIds.map(async (propertyId) => {
        const ratingData = await calculatePropertyRating(propertyId);
        ratingsMap.set(propertyId, ratingData);
      })
    );
  } catch (error) {
    console.error('❌ Error getting property ratings map:', error);
  }
  
  return ratingsMap;
}

/**
 * Check if a user can rate a property (has viewed it)
 */
export async function canUserRateProperty(
  propertyId: string,
  userId: string
): Promise<boolean> {
  // For now, allow all authenticated users to rate
  // In the future, we can check if they've viewed or booked the property
  return !!userId;
}

/**
 * Send notification to owner when a new rating is created
 */
async function sendNewRatingNotification(
  rating: PropertyRatingRecord,
  propertyId: string
): Promise<void> {
  try {
    const listing = await db.get<PublishedListingRecord>('published_listings', propertyId);
    if (!listing) {
      console.warn('⚠️ Listing not found for rating notification');
      return;
    }

    // Get tenant name
    let tenantName = 'A tenant';
    try {
      const users = await db.list('users');
      const tenant = users.find((u: any) => u.id === rating.userId);
      tenantName = rating.isAnonymous ? 'An anonymous tenant' : (tenant?.name || tenant?.email || 'A tenant');
    } catch (error) {
      console.error('Error getting tenant name:', error);
    }

    const stars = '⭐'.repeat(rating.rating);
    const messageText = `⭐ New Rating Received!\n\n` +
      `Property: ${listing.propertyType} - ${listing.address.substring(0, 50)}${listing.address.length > 50 ? '...' : ''}\n` +
      `Rating: ${rating.rating} ${stars}\n` +
      `From: ${tenantName}\n` +
      (rating.review ? `Review: "${rating.review.substring(0, 100)}${rating.review.length > 100 ? '...' : ''}"\n\n` : '\n') +
      `You can reply to this rating from your dashboard.`;

    // Find an active booking to get conversation
    const bookings = await db.list('bookings');
    const activeBooking = bookings.find((b: any) => 
      b.propertyId === propertyId && 
      b.tenantId === rating.userId && 
      (b.status === 'approved' || b.status === 'pending')
    );

    // Create a notification message (not a regular message) that appears in notification modal
    // Find any booking with this tenant and owner to get conversation
    const anyBooking = bookings.find((b: any) => 
      b.ownerId === listing.userId && b.tenantId === rating.userId
    );

    if (anyBooking) {
      const conversationId = await createOrFindConversation({
        ownerId: listing.userId,
        tenantId: rating.userId,
      });

      const messageId = generateId('msg');
      const now = new Date().toISOString();

      // Create as notification type, not regular message
      const messageRecord: MessageRecord = {
        id: messageId,
        conversationId,
        senderId: rating.userId,
        text: messageText,
        createdAt: now,
        readBy: [rating.userId],
        type: 'notification', // Changed to notification type
        propertyId: propertyId,
        propertyTitle: listing.propertyType,
      };

      await db.upsert('messages', messageId, messageRecord);

      // Don't update conversation's lastMessageText for notifications
      // Notifications should not appear in conversation list
      const conversation = await db.get<ConversationRecord>('conversations', conversationId);
      if (conversation) {
        // Get the last non-notification message to use as lastMessageText
        const allMessages = await db.list<MessageRecord>('messages');
        const conversationMessages = allMessages
          .filter(msg => 
            msg.conversationId === conversationId && 
            msg.type !== 'notification'
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const lastRegularMessage = conversationMessages[0];
        const lastMessageText = lastRegularMessage 
          ? (lastRegularMessage.type === 'image' ? '📷 Image' : lastRegularMessage.text.substring(0, 100))
          : conversation.lastMessageText;
        const lastMessageAt = lastRegularMessage?.createdAt || conversation.lastMessageAt || now;
        
        await db.upsert('conversations', conversationId, {
          ...conversation,
          lastMessageText: lastMessageText,
          lastMessageAt: lastMessageAt,
          updatedAt: now,
        });
      }

      console.log('✅ New rating notification sent to owner (as notification, not message)');
    } else {
      // If no booking exists, still create notification but without conversation
      // This is a fallback for edge cases
      console.log('⚠️ No booking found for rating notification, notification created without conversation');
    }
  } catch (error) {
    console.error('❌ Error sending new rating notification:', error);
  }
}

