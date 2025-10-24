import React, { useState, useEffect } from 'react';
import { View, Image, Animated, StyleSheet, Platform, Text } from 'react-native';
import { Home } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { optimizeImageUri, ImageLoadingMetrics, isValidImageUri } from '../../../utils/image-optimization';
import { loadPropertyMediaFromStorage, savePropertyMediaToStorage } from '../../../utils/media-storage';

interface CoverPhotoProps {
  listingId: string;
  coverPhoto?: string;
  fallbackImage?: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  showSkeleton?: boolean;
  borderRadius?: number;
  onLoad?: () => void;
  onError?: () => void;
  enableOptimization?: boolean;
  optimizationOptions?: {
    width?: number;
    height?: number;
    quality?: number;
  };
  enablePersistence?: boolean;
}

const CoverPhoto: React.FC<CoverPhotoProps> = ({
  listingId,
  coverPhoto,
  fallbackImage,
  style,
  resizeMode = 'cover',
  showSkeleton = true,
  borderRadius = 0,
  onLoad,
  onError,
  enableOptimization = true,
  optimizationOptions = {},
  enablePersistence = true
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [skeletonAnim] = useState(new Animated.Value(0.3));
  const [optimizedSource, setOptimizedSource] = useState<{ uri: string } | null>(null);
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);

  const metrics = ImageLoadingMetrics.getInstance();

  // Load cached image on component mount
  useEffect(() => {
    const loadCachedImage = async () => {
      // First, try to load from props immediately (this is the most reliable source)
      const imageUri = coverPhoto || fallbackImage;
      
      console.log('🖼️ CoverPhoto component loading for listing:', listingId, {
        hasCoverPhoto: !!coverPhoto,
        hasFallbackImage: !!fallbackImage,
        finalUri: imageUri,
        enablePersistence,
        coverPhotoValue: coverPhoto?.substring(0, 50) + '...',
        fallbackImageValue: fallbackImage?.substring(0, 50) + '...'
      });

      if (imageUri && imageUri.trim() !== '' && imageUri !== 'null' && imageUri !== 'undefined') {
        console.log('📸 Loading cover photo from props for listing:', listingId);
        
        // Validate URI
        if (!isValidImageUri(imageUri)) {
          console.log('❌ Invalid cover photo URI:', imageUri);
          setError(true);
          setLoading(false);
          return;
        }

        // Start loading metrics
        metrics.startLoading(imageUri);

        // Optimize the image
        if (enableOptimization) {
          const optimized = optimizeImageUri(imageUri, {
            width: optimizationOptions.width,
            height: optimizationOptions.height,
            quality: optimizationOptions.quality || 0.8,
          });
          console.log('🔧 Optimized image URI:', optimized.uri?.substring(0, 50) + '...');
          setOptimizedSource(optimized);
        } else {
          console.log('🔧 Using original image URI:', imageUri.substring(0, 50) + '...');
          setOptimizedSource({ uri: imageUri });
        }

        // Cache the image for future use
        if (enablePersistence && listingId) {
          cacheImage(imageUri);
        }
        
        return;
      }

      // If no props available, try to load from cache
      if (enablePersistence && listingId) {
        try {
          console.log('🔄 Loading cached cover photo for listing:', listingId);
          const cachedMedia = await loadPropertyMediaFromStorage(listingId);
          
          if (cachedMedia?.coverPhoto) {
            console.log('✅ Found cached cover photo for listing:', listingId);
            setCachedImageUri(cachedMedia.coverPhoto);
            
            // Optimize cached image
            if (enableOptimization && isValidImageUri(cachedMedia.coverPhoto)) {
              const optimized = optimizeImageUri(cachedMedia.coverPhoto, {
                width: optimizationOptions.width,
                height: optimizationOptions.height,
                quality: optimizationOptions.quality || 0.8,
              });
              setOptimizedSource(optimized);
            } else {
              setOptimizedSource({ uri: cachedMedia.coverPhoto });
            }
            
            setLoading(false);
            setError(false);
            onLoad?.();
            return;
          }
        } catch (error) {
          console.log('⚠️ Error loading cached cover photo:', error);
        }
      }

      // If no image available from any source, try to use fallback image
      if (fallbackImage && fallbackImage.trim() !== '' && fallbackImage !== 'null' && fallbackImage !== 'undefined') {
        console.log('🔄 Using fallback image for listing:', listingId, {
          fallbackImage: fallbackImage.substring(0, 50) + '...'
        });
        
        // Validate fallback URI
        if (isValidImageUri(fallbackImage)) {
          // Start loading metrics
          metrics.startLoading(fallbackImage);

          // Optimize the fallback image
          if (enableOptimization) {
            const optimized = optimizeImageUri(fallbackImage, {
              width: optimizationOptions.width,
              height: optimizationOptions.height,
              quality: optimizationOptions.quality || 0.8,
            });
            console.log('🔧 Optimized fallback image URI:', optimized.uri?.substring(0, 50) + '...');
            setOptimizedSource(optimized);
          } else {
            console.log('🔧 Using original fallback image URI:', fallbackImage.substring(0, 50) + '...');
            setOptimizedSource({ uri: fallbackImage });
          }
          
          return;
        } else {
          console.log('❌ Fallback image is also invalid:', fallbackImage);
        }
      }
      
      // If no valid image available from any source, show error
      console.log('❌ No valid cover photo available for listing:', listingId, {
        hasCoverPhoto: !!coverPhoto,
        hasFallbackImage: !!fallbackImage,
        coverPhotoValue: coverPhoto,
        fallbackImageValue: fallbackImage
      });
      setError(true);
      setLoading(false);
    };

    const cacheImage = async (imageUri: string) => {
      try {
        console.log('💾 Caching cover photo for listing:', listingId);
        await savePropertyMediaToStorage(listingId, {
          coverPhoto: imageUri,
          photos: [],
          videos: []
        });
        console.log('✅ Cover photo cached successfully');
      } catch (error) {
        console.log('⚠️ Error caching cover photo:', error);
      }
    };

    loadCachedImage();
  }, [listingId, coverPhoto, fallbackImage, enableOptimization, optimizationOptions, enablePersistence]);

  useEffect(() => {
    // Skeleton animation
    if (showSkeleton && loading) {
      const skeletonAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      skeletonAnimation.start();

      return () => skeletonAnimation.stop();
    }
  }, [loading, showSkeleton]);

  const handleLoad = () => {
    console.log('✅ Image loaded successfully for listing:', listingId, {
      uri: optimizedSource?.uri?.substring(0, 50) + '...'
    });
    setLoading(false);
    setError(false);
    
    // End loading metrics
    if (optimizedSource?.uri) {
      metrics.endLoading(optimizedSource.uri, true);
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onLoad?.();
  };

  const handleError = (error?: any) => {
    console.log('❌ Cover photo load error:', {
      listingId,
      uri: optimizedSource?.uri?.substring(0, 100) + '...' || 'N/A',
      error: error?.message || error,
      errorType: typeof error,
      hasOptimizedSource: !!optimizedSource,
      optimizedSourceUri: optimizedSource?.uri
    });
    
    setLoading(false);
    setError(true);
    
    // End loading metrics
    if (optimizedSource?.uri) {
      metrics.endLoading(optimizedSource.uri, false);
    }
    
    onError?.(error);
  };

  const renderSkeleton = () => {
    if (!showSkeleton || !loading) return null;

    return (
      <Animated.View
        style={[
          styles.skeleton,
          style,
          {
            opacity: skeletonAnim,
            borderRadius: borderRadius || 0,
          }
        ]}
      >
        <LinearGradient
          colors={['#F3F4F6', '#E5E7EB', '#F3F4F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.skeletonGradient,
            { borderRadius: borderRadius || 0 }
          ]}
        />
      </Animated.View>
    );
  };

  const renderFallback = () => {
    if (!error) return null;

    console.log('🖼️ Rendering fallback UI for listing:', listingId, {
      hasCoverPhoto: !!coverPhoto,
      hasFallbackImage: !!fallbackImage,
      error,
      loading
    });

    return (
      <View style={[styles.fallback, style, { borderRadius: borderRadius || 0 }]}>
        <Home size={48} color="#9CA3AF" />
        <Text style={styles.fallbackText}>No Photo Available</Text>
      </View>
    );
  };

  const renderImage = () => {
    if (error || !optimizedSource) {
      console.log('🖼️ Not rendering image for listing:', listingId, {
        error,
        hasOptimizedSource: !!optimizedSource,
        optimizedSourceUri: optimizedSource?.uri?.substring(0, 50) + '...' || 'null'
      });
      return null;
    }

    console.log('🖼️ Rendering image for listing:', listingId, {
      uri: optimizedSource.uri?.substring(0, 50) + '...',
      loading,
      error
    });

    return (
      <Animated.Image
        source={optimizedSource}
        style={[
          style,
          {
            opacity: fadeAnim,
            borderRadius: borderRadius || 0,
            // Ensure proper sizing on web
            ...(Platform.OS === 'web' && {
              maxWidth: '100%',
              height: 'auto',
            })
          }
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderSkeleton()}
      {renderImage()}
      {renderFallback()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F3F4F6',
  },
  skeletonGradient: {
    flex: 1,
  },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  fallbackText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default CoverPhoto;
