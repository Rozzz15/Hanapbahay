import { ImageLoadingMetrics, preloadImages, batchOptimizeImages } from './image-optimization';

export interface ImagePreloadConfig {
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
  enableMetrics: boolean;
}

export class ImagePreloader {
  private static instance: ImagePreloader;
  private preloadedImages: Set<string> = new Set();
  private loadingQueue: string[] = [];
  private currentlyLoading: Set<string> = new Set();
  private config: ImagePreloadConfig;
  private metrics: ImageLoadingMetrics;

  constructor(config: Partial<ImagePreloadConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent || 5,
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 2,
      enableMetrics: config.enableMetrics !== false,
    };
    this.metrics = ImageLoadingMetrics.getInstance();
  }

  static getInstance(config?: Partial<ImagePreloadConfig>): ImagePreloader {
    if (!ImagePreloader.instance) {
      ImagePreloader.instance = new ImagePreloader(config);
    }
    return ImagePreloader.instance;
  }

  /**
   * Preload a single image
   */
  async preloadImage(uri: string): Promise<boolean> {
    if (!uri || this.preloadedImages.has(uri)) {
      return true;
    }

    if (this.currentlyLoading.has(uri)) {
      // Wait for the current loading to complete
      return this.waitForImage(uri);
    }

    return this.loadImage(uri);
  }

  /**
   * Preload multiple images with concurrency control
   */
  async preloadImages(imageUris: string[]): Promise<{ success: string[]; failed: string[] }> {
    const validUris = imageUris.filter(uri => uri && !this.preloadedImages.has(uri));
    
    if (validUris.length === 0) {
      return { success: [], failed: [] };
    }

    const success: string[] = [];
    const failed: string[] = [];

    // Process images in batches to control concurrency
    const batches = this.createBatches(validUris, this.config.maxConcurrent);

    for (const batch of batches) {
      const batchPromises = batch.map(async (uri) => {
        try {
          const loaded = await this.loadImage(uri);
          if (loaded) {
            success.push(uri);
          } else {
            failed.push(uri);
          }
        } catch (error) {
          console.log(`❌ Failed to preload image: ${uri}`, error);
          failed.push(uri);
        }
      });

      await Promise.allSettled(batchPromises);
    }

    console.log(`✅ Image preloading completed: ${success.length} success, ${failed.length} failed`);
    return { success, failed };
  }

  /**
   * Preload images for a specific listing
   */
  async preloadListingImages(listingId: string, imageUris: string[]): Promise<void> {
    console.log(`🔄 Preloading images for listing ${listingId}:`, imageUris.length);
    
    const { success, failed } = await this.preloadImages(imageUris);
    
    console.log(`✅ Listing ${listingId} images preloaded:`, {
      success: success.length,
      failed: failed.length,
      total: imageUris.length
    });

    if (this.config.enableMetrics) {
      const avgTime = this.metrics.getAverageLoadingTime();
      const successRate = this.metrics.getSuccessRate();
      console.log(`📊 Image loading metrics:`, {
        averageTime: `${avgTime.toFixed(0)}ms`,
        successRate: `${(successRate * 100).toFixed(1)}%`
      });
    }
  }

  /**
   * Preload images for multiple listings
   */
  async preloadMultipleListings(listings: Array<{ id: string; images: string[] }>): Promise<void> {
    console.log(`🔄 Preloading images for ${listings.length} listings`);
    
    const allImages = listings.flatMap(listing => 
      listing.images.map(uri => ({ uri, listingId: listing.id }))
    );

    const { success, failed } = await this.preloadImages(allImages.map(item => item.uri));
    
    console.log(`✅ Multiple listings images preloaded:`, {
      success: success.length,
      failed: failed.length,
      total: allImages.length
    });
  }

  /**
   * Check if an image is already preloaded
   */
  isPreloaded(uri: string): boolean {
    return this.preloadedImages.has(uri);
  }

  /**
   * Get preloading statistics
   */
  getStats(): { preloaded: number; loading: number; queued: number } {
    return {
      preloaded: this.preloadedImages.size,
      loading: this.currentlyLoading.size,
      queued: this.loadingQueue.length,
    };
  }

  /**
   * Clear preloaded images cache
   */
  clearCache(): void {
    this.preloadedImages.clear();
    this.loadingQueue = [];
    this.currentlyLoading.clear();
    
    if (this.config.enableMetrics) {
      this.metrics.clear();
    }
    
    console.log('🗑️ Image preloader cache cleared');
  }

  /**
   * Private method to load a single image
   */
  private async loadImage(uri: string): Promise<boolean> {
    if (this.currentlyLoading.has(uri)) {
      return this.waitForImage(uri);
    }

    this.currentlyLoading.add(uri);

    try {
      if (this.config.enableMetrics) {
        this.metrics.startLoading(uri);
      }

      await this.loadImageWithTimeout(uri);
      
      this.preloadedImages.add(uri);
      
      if (this.config.enableMetrics) {
        this.metrics.endLoading(uri, true);
      }

      console.log(`✅ Image preloaded successfully: ${uri.substring(0, 50)}...`);
      return true;
    } catch (error) {
      console.log(`❌ Failed to preload image: ${uri}`, error);
      
      if (this.config.enableMetrics) {
        this.metrics.endLoading(uri, false);
      }
      
      return false;
    } finally {
      this.currentlyLoading.delete(uri);
    }
  }

  /**
   * Private method to load image with timeout
   */
  private async loadImageWithTimeout(uri: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Image loading timeout: ${uri}`));
      }, this.config.timeout);

      preloadImages([uri])
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Private method to wait for an image that's currently loading
   */
  private async waitForImage(uri: string): Promise<boolean> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.currentlyLoading.has(uri)) {
          clearInterval(checkInterval);
          resolve(this.preloadedImages.has(uri));
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 30000);
    });
  }

  /**
   * Private method to create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

/**
 * Convenience function to preload images for listings
 */
export const preloadListingImages = async (
  listings: Array<{ id: string; images: string[] }>,
  config?: Partial<ImagePreloadConfig>
): Promise<void> => {
  const preloader = ImagePreloader.getInstance(config);
  await preloader.preloadMultipleListings(listings);
};

/**
 * Convenience function to preload images for a single listing
 */
export const preloadSingleListingImages = async (
  listingId: string,
  imageUris: string[],
  config?: Partial<ImagePreloadConfig>
): Promise<void> => {
  const preloader = ImagePreloader.getInstance(config);
  await preloader.preloadListingImages(listingId, imageUris);
};

/**
 * Get image preloader instance
 */
export const getImagePreloader = (config?: Partial<ImagePreloadConfig>): ImagePreloader => {
  return ImagePreloader.getInstance(config);
};
