import { db, generateId } from './db';
import { PropertyRatingRecord } from '@/types';

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
  review?: string
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
        createdAt: now,
        updatedAt: now
      };
      
      await db.upsert('property_ratings', ratingId, newRating);
      console.log('✅ Created new rating for property:', propertyId);
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

