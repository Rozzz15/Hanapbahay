import { db } from './db';
import { FavoriteRecord } from '@/types';
import { dispatchCustomEvent } from './custom-events';

/**
 * Add a property to user's favorites
 */
export async function addToFavorites(userId: string, propertyId: string): Promise<void> {
  try {
    const favoriteId = `${userId}_${propertyId}`;
    const favorite: FavoriteRecord = {
      id: favoriteId,
      userId,
      propertyId,
      createdAt: new Date().toISOString()
    };
    
    await db.upsert('favorites', favoriteId, favorite);
    console.log('✅ Added to favorites:', { userId, propertyId });
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    throw error;
  }
}

/**
 * Remove a property from user's favorites
 */
export async function removeFromFavorites(userId: string, propertyId: string): Promise<void> {
  try {
    const favoriteId = `${userId}_${propertyId}`;
    await db.remove('favorites', favoriteId);
    console.log('✅ Removed from favorites:', { userId, propertyId });
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    throw error;
  }
}

/**
 * Check if a property is in user's favorites
 */
export async function isFavorite(userId: string, propertyId: string): Promise<boolean> {
  try {
    const favoriteId = `${userId}_${propertyId}`;
    const favorite = await db.get('favorites', favoriteId) as FavoriteRecord | null;
    return !!favorite;
  } catch (error) {
    console.error('❌ Error checking favorite status:', error);
    return false;
  }
}

/**
 * Get all favorite property IDs for a user
 */
export async function getUserFavorites(userId: string): Promise<string[]> {
  try {
    const allFavorites = await db.list('favorites') as FavoriteRecord[];
    const userFavorites = allFavorites
      .filter(fav => fav.userId === userId)
      .map(fav => fav.propertyId);
    
    console.log('✅ User favorites loaded:', { userId, count: userFavorites.length });
    return userFavorites;
  } catch (error) {
    console.error('❌ Error loading user favorites:', error);
    return [];
  }
}

/**
 * Toggle favorite status for a property
 */
export async function toggleFavorite(userId: string, propertyId: string): Promise<boolean> {
  try {
    const isCurrentlyFavorite = await isFavorite(userId, propertyId);
    
    if (isCurrentlyFavorite) {
      await removeFromFavorites(userId, propertyId);
      // Dispatch event to notify other components
      dispatchCustomEvent('favoriteChanged');
      return false;
    } else {
      await addToFavorites(userId, propertyId);
      // Dispatch event to notify other components
      dispatchCustomEvent('favoriteChanged');
      return true;
    }
  } catch (error) {
    console.error('❌ Error toggling favorite:', error);
    throw error;
  }
}
