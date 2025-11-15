import { db, generateId } from './db';
import { PropertyRatingRecord, PublishedListingRecord, MessageRecord, ConversationRecord } from '../types';
import { createOrFindConversation } from './conversation-utils';

/**
 * Reply to a rating as an owner
 */
export async function replyToRating(
  ratingId: string,
  ownerId: string,
  reply: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!reply || reply.trim().length === 0) {
      return { success: false, message: 'Reply cannot be empty' };
    }

    const rating = await db.get<PropertyRatingRecord>('property_ratings', ratingId);
    if (!rating) {
      return { success: false, message: 'Rating not found' };
    }

    // Verify the owner owns the property
    const listing = await db.get<PublishedListingRecord>('published_listings', rating.propertyId);
    if (!listing || listing.userId !== ownerId) {
      return { success: false, message: 'You do not have permission to reply to this rating' };
    }

    const now = new Date().toISOString();
    const updatedRating: PropertyRatingRecord = {
      ...rating,
      ownerReply: reply.trim(),
      ownerReplyAt: now,
      updatedAt: now,
    };

    await db.upsert('property_ratings', ratingId, updatedRating);
    console.log('✅ Owner reply added to rating:', ratingId);

    // Send notification to tenant about the reply
    try {
      await sendRatingReplyNotification(rating, listing, reply.trim());
    } catch (notifError) {
      console.error('⚠️ Failed to send notification, but reply was saved:', notifError);
    }

    return { success: true, message: 'Reply posted successfully!' };
  } catch (error) {
    console.error('❌ Error replying to rating:', error);
    return { success: false, message: 'Failed to post reply. Please try again.' };
  }
}

/**
 * Update an existing reply
 */
export async function updateRatingReply(
  ratingId: string,
  ownerId: string,
  reply: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!reply || reply.trim().length === 0) {
      return { success: false, message: 'Reply cannot be empty' };
    }

    const rating = await db.get<PropertyRatingRecord>('property_ratings', ratingId);
    if (!rating) {
      return { success: false, message: 'Rating not found' };
    }

    // Verify the owner owns the property
    const listing = await db.get<PublishedListingRecord>('published_listings', rating.propertyId);
    if (!listing || listing.userId !== ownerId) {
      return { success: false, message: 'You do not have permission to update this reply' };
    }

    const now = new Date().toISOString();
    const updatedRating: PropertyRatingRecord = {
      ...rating,
      ownerReply: reply.trim(),
      ownerReplyAt: now,
      updatedAt: now,
    };

    await db.upsert('property_ratings', ratingId, updatedRating);
    console.log('✅ Owner reply updated for rating:', ratingId);

    return { success: true, message: 'Reply updated successfully!' };
  } catch (error) {
    console.error('❌ Error updating rating reply:', error);
    return { success: false, message: 'Failed to update reply. Please try again.' };
  }
}

/**
 * Delete an owner's reply
 */
export async function deleteRatingReply(
  ratingId: string,
  ownerId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const rating = await db.get<PropertyRatingRecord>('property_ratings', ratingId);
    if (!rating) {
      return { success: false, message: 'Rating not found' };
    }

    // Verify the owner owns the property
    const listing = await db.get<PublishedListingRecord>('published_listings', rating.propertyId);
    if (!listing || listing.userId !== ownerId) {
      return { success: false, message: 'You do not have permission to delete this reply' };
    }

    const now = new Date().toISOString();
    const updatedRating: PropertyRatingRecord = {
      ...rating,
      ownerReply: undefined,
      ownerReplyAt: undefined,
      updatedAt: now,
    };

    await db.upsert('property_ratings', ratingId, updatedRating);
    console.log('✅ Owner reply deleted for rating:', ratingId);

    return { success: true, message: 'Reply deleted successfully!' };
  } catch (error) {
    console.error('❌ Error deleting rating reply:', error);
    return { success: false, message: 'Failed to delete reply. Please try again.' };
  }
}

/**
 * Send notification to tenant when owner replies to their rating
 */
async function sendRatingReplyNotification(
  rating: PropertyRatingRecord,
  listing: PublishedListingRecord,
  reply: string
): Promise<void> {
  try {
    const booking = await db.list('bookings');
    const tenantBooking = booking.find((b: any) => 
      b.propertyId === listing.id && b.tenantId === rating.userId && b.status === 'approved'
    );

    if (!tenantBooking) {
      console.log('⚠️ No active booking found for rating notification');
      return;
    }

    const messageText = `💬 Owner Replied to Your Review\n\n` +
      `Property: ${listing.propertyType} - ${listing.address.substring(0, 50)}...\n` +
      `Your Rating: ${rating.rating} ⭐\n\n` +
      `Owner's Reply:\n"${reply}"\n\n` +
      `Thank you for your feedback!`;

    const conversationId = await createOrFindConversation({
      ownerId: listing.userId,
      tenantId: rating.userId,
    });

    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: listing.userId,
      text: messageText,
      createdAt: now,
      readBy: [listing.userId],
      type: 'message',
    };

    await db.upsert('messages', messageId, messageRecord);

    // Update conversation
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: messageText.substring(0, 100),
        lastMessageAt: now,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Rating reply notification sent to tenant');
  } catch (error) {
    console.error('❌ Error sending rating reply notification:', error);
  }
}

/**
 * Get all ratings for an owner's properties
 */
export async function getRatingsForOwner(ownerId: string): Promise<Array<PropertyRatingRecord & {
  propertyTitle: string;
  propertyAddress: string;
  tenantName?: string;
}>> {
  try {
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    const ownerListings = allListings.filter(listing => listing.userId === ownerId);
    const ownerPropertyIds = ownerListings.map(listing => listing.id);

    const allRatings = await db.list<PropertyRatingRecord>('property_ratings');
    const ownerRatings = allRatings.filter(rating => ownerPropertyIds.includes(rating.propertyId));

    // Enrich with property and tenant info
    const enrichedRatings = await Promise.all(
      ownerRatings.map(async (rating) => {
        const listing = ownerListings.find(l => l.id === rating.propertyId);
        let tenantName: string | undefined;
        
        try {
          const users = await db.list('users');
          const tenant = users.find((u: any) => u.id === rating.userId);
          tenantName = tenant?.name || tenant?.email || 'Anonymous';
        } catch (error) {
          console.error('Error getting tenant name:', error);
        }

        return {
          ...rating,
          propertyTitle: listing?.propertyType || 'Unknown Property',
          propertyAddress: listing?.address || 'Unknown Address',
          tenantName: rating.isAnonymous ? 'Anonymous' : tenantName,
        };
      })
    );

    // Sort by most recent first
    return enrichedRatings.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('❌ Error getting ratings for owner:', error);
    return [];
  }
}

