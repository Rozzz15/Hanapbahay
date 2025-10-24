/**
 * Image optimization utilities to prevent serialization errors
 * by reducing image sizes and converting to more efficient formats
 */

export interface ImageOptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeKB?: number;
}

// Image loading metrics singleton class
class ImageLoadingMetricsClass {
    private static instance: ImageLoadingMetricsClass;
    private loadingTimes: Map<string, number> = new Map();
    private completedLoadTimes: number[] = [];
    private successCount: number = 0;
    private errorCount: number = 0;

    static getInstance(): ImageLoadingMetricsClass {
        if (!ImageLoadingMetricsClass.instance) {
            ImageLoadingMetricsClass.instance = new ImageLoadingMetricsClass();
        }
        return ImageLoadingMetricsClass.instance;
    }

    startLoading(uri: string): void {
        this.loadingTimes.set(uri, Date.now());
    }

    endLoading(uri: string, success: boolean): void {
        const startTime = this.loadingTimes.get(uri);
        if (startTime) {
            const loadTime = Date.now() - startTime;
            this.completedLoadTimes.push(loadTime);
            console.log(`Image loaded in ${loadTime}ms: ${uri.substring(0, 50)}...`);
            this.loadingTimes.delete(uri);
        }
        
        if (success) {
            this.successCount++;
        } else {
            this.errorCount++;
        }
    }

    getStats() {
        return {
            successCount: this.successCount,
            errorCount: this.errorCount,
            currentlyLoading: this.loadingTimes.size
        };
    }

    getAverageLoadingTime(): number {
        if (this.completedLoadTimes.length === 0) {
            return 0;
        }
        const total = this.completedLoadTimes.reduce((sum, time) => sum + time, 0);
        return total / this.completedLoadTimes.length;
    }

    getSuccessRate(): number {
        const total = this.successCount + this.errorCount;
        if (total === 0) {
            return 0;
        }
        return this.successCount / total;
    }

    clear(): void {
        this.loadingTimes.clear();
        this.completedLoadTimes = [];
        this.successCount = 0;
        this.errorCount = 0;
    }
}

export const ImageLoadingMetrics = ImageLoadingMetricsClass;

export const optimizeImageForStorage = async (
    imageUri: string,
    options: ImageOptimizationOptions = {}
): Promise<string> => {
    const {
        maxWidth = 512,
        maxHeight = 512,
        quality = 0.7,
        maxSizeKB = 500
    } = options;

    try {
        // If it's already a data URI, check if it needs optimization
        if (imageUri.startsWith('data:')) {
            const currentSizeKB = (imageUri.length * 0.75) / 1024; // Approximate base64 to KB conversion
            
            if (currentSizeKB <= maxSizeKB) {
                return imageUri; // Already optimized enough
            }
        }

        // For now, return the original URI
        // In a real implementation, you would use a library like react-native-image-resizer
        // to actually resize and compress the image
        return imageUri;
    } catch (error) {
        console.error('Error optimizing image:', error);
        return imageUri; // Return original if optimization fails
    }
};

export const validateImageSize = (imageUri: string, maxSizeKB: number = 500): boolean => {
    try {
        if (imageUri.startsWith('data:')) {
            const sizeKB = (imageUri.length * 0.75) / 1024;
            return sizeKB <= maxSizeKB;
        }
        return true; // Assume external URIs are fine
    } catch (error) {
        console.error('Error validating image size:', error);
        return false;
    }
};

export const compressImageData = (imageData: string): string => {
    try {
        // Simple compression by reducing quality indicators in data URI
        if (imageData.startsWith('data:image/jpeg')) {
            // For JPEG, we could implement more sophisticated compression
            // For now, just return the original
            return imageData;
        }
        
        if (imageData.startsWith('data:image/png')) {
            // For PNG, we could implement more sophisticated compression
            // For now, just return the original
            return imageData;
        }
        
        return imageData;
    } catch (error) {
        console.error('Error compressing image data:', error);
        return imageData;
    }
};

// Additional functions needed by LoadingImage component
export const optimizeImageUri = (uri: string, options: ImageOptimizationOptions = {}): { uri: string } => {
    try {
        // For now, just return the original URI wrapped in the expected format
        // In a real implementation, you would optimize the image here
        return { uri };
    } catch (error) {
        console.error('Error optimizing image URI:', error);
        return { uri };
    }
};

export const isValidImageUri = (uri: string): boolean => {
    try {
        if (!uri || typeof uri !== 'string') {
            return false;
        }
        
        // Check for data URIs
        if (uri.startsWith('data:image/')) {
            return true;
        }
        
        // Check for HTTP/HTTPS URLs
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
            return true;
        }
        
        // Check for file URIs (for local files)
        if (uri.startsWith('file://')) {
            return true;
        }
        
        // Check for asset URIs (React Native assets)
        if (uri.startsWith('asset://') || uri.startsWith('content://')) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error validating image URI:', error);
        return false;
    }
};