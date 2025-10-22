import { Platform } from 'react-native';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  enableProgressive?: boolean;
  enableBlur?: boolean;
  blurRadius?: number;
}

export interface OptimizedImageSource {
  uri: string;
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Optimize image URI for better loading performance
 * This function can be extended to integrate with image optimization services
 */
export const optimizeImageUri = (
  originalUri: string,
  options: ImageOptimizationOptions = {}
): OptimizedImageSource => {
  if (!originalUri) {
    return { uri: '' };
  }

  // For base64 images, return as-is
  if (originalUri.startsWith('data:')) {
    return { uri: originalUri };
  }

  // For local file URIs, return as-is
  if (originalUri.startsWith('file://')) {
    return { uri: originalUri };
  }

  // For web URLs, we could add optimization parameters here
  // This is where you'd integrate with services like Cloudinary, ImageKit, etc.
  const optimizedUri = originalUri;

  return {
    uri: optimizedUri,
    width: options.width,
    height: options.height,
    quality: options.quality || 0.8,
  };
};

/**
 * Preload images for better performance
 */
export const preloadImages = async (imageUris: string[]): Promise<void> => {
  if (Platform.OS === 'web') {
    // On web, preload images using Image constructor
    const preloadPromises = imageUris.map(uri => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload image: ${uri}`));
        img.src = uri;
      });
    });

    try {
      await Promise.all(preloadPromises);
      console.log('✅ All images preloaded successfully');
    } catch (error) {
      console.log('⚠️ Some images failed to preload:', error);
    }
  } else {
    // On mobile, we can use Image.prefetch for React Native
    const { Image } = require('react-native');
    const preloadPromises = imageUris.map(uri => Image.prefetch(uri));
    
    try {
      await Promise.all(preloadPromises);
      console.log('✅ All images preloaded successfully');
    } catch (error) {
      console.log('⚠️ Some images failed to preload:', error);
    }
  }
};

/**
 * Get image dimensions from URI
 */
export const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${uri}`));
      img.src = uri;
    } else {
      const { Image } = require('react-native');
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    }
  });
};

/**
 * Generate placeholder image URI based on dimensions
 */
export const generatePlaceholderUri = (width: number, height: number, text?: string): string => {
  const encodedText = text ? encodeURIComponent(text) : 'Image';
  return `https://via.placeholder.com/${width}x${height}/F3F4F6/9CA3AF?text=${encodedText}`;
};

/**
 * Check if image URI is valid
 */
export const isValidImageUri = (uri: string): boolean => {
  if (!uri) return false;
  
  // Check for common image formats
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
  const dataUriPattern = /^data:image\//;
  const fileUriPattern = /^file:\/\//;
  const httpUriPattern = /^https?:\/\//;
  
  return (
    imageExtensions.test(uri) ||
    dataUriPattern.test(uri) ||
    fileUriPattern.test(uri) ||
    httpUriPattern.test(uri)
  );
};

/**
 * Batch optimize multiple images
 */
export const batchOptimizeImages = (
  imageUris: string[],
  options: ImageOptimizationOptions = {}
): OptimizedImageSource[] => {
  return imageUris.map(uri => optimizeImageUri(uri, options));
};

/**
 * Create responsive image sources for different screen densities
 */
export const createResponsiveImageSources = (
  baseUri: string,
  sizes: number[] = [1, 2, 3]
): OptimizedImageSource[] => {
  return sizes.map(size => ({
    uri: baseUri,
    width: size * 100, // Example: 100px, 200px, 300px
    height: size * 100,
    quality: 0.8,
  }));
};

/**
 * Image loading performance metrics
 */
export class ImageLoadingMetrics {
  private static instance: ImageLoadingMetrics;
  private metrics: Map<string, { startTime: number; endTime?: number; success: boolean }> = new Map();

  static getInstance(): ImageLoadingMetrics {
    if (!ImageLoadingMetrics.instance) {
      ImageLoadingMetrics.instance = new ImageLoadingMetrics();
    }
    return ImageLoadingMetrics.instance;
  }

  startLoading(uri: string): void {
    this.metrics.set(uri, {
      startTime: Date.now(),
      success: false,
    });
  }

  endLoading(uri: string, success: boolean): void {
    const metric = this.metrics.get(uri);
    if (metric) {
      metric.endTime = Date.now();
      metric.success = success;
    }
  }

  getMetrics(): Array<{ uri: string; duration: number; success: boolean }> {
    const results: Array<{ uri: string; duration: number; success: boolean }> = [];
    
    this.metrics.forEach((metric, uri) => {
      if (metric.endTime) {
        results.push({
          uri,
          duration: metric.endTime - metric.startTime,
          success: metric.success,
        });
      }
    });

    return results;
  }

  getAverageLoadingTime(): number {
    const metrics = this.getMetrics();
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalTime / metrics.length;
  }

  getSuccessRate(): number {
    const metrics = this.getMetrics();
    if (metrics.length === 0) return 0;
    
    const successCount = metrics.filter(metric => metric.success).length;
    return successCount / metrics.length;
  }

  clear(): void {
    this.metrics.clear();
  }
}
