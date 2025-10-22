import React, { useState, useEffect } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { Home, Image as ImageIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { optimizeImageUri, ImageLoadingMetrics, isValidImageUri } from '../../../utils/image-optimization';

interface LoadingImageProps {
  source: { uri: string } | number;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  fallbackIcon?: 'home' | 'image';
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
}

const { width: screenWidth } = Dimensions.get('window');

const LoadingImage: React.FC<LoadingImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  fallbackIcon = 'home',
  showSkeleton = true,
  borderRadius = 0,
  onLoad,
  onError,
  enableOptimization = true,
  optimizationOptions = {}
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [skeletonAnim] = useState(new Animated.Value(0.3));
  const [optimizedSource, setOptimizedSource] = useState(source);

  const metrics = ImageLoadingMetrics.getInstance();

  useEffect(() => {
    // Reset states when source changes
    setLoading(true);
    setError(false);
    fadeAnim.setValue(0);

    // Optimize image URI if enabled and it's a URI source
    if (enableOptimization && source && typeof source === 'object' && 'uri' in source) {
      const uri = source.uri;
      
      // Validate URI first - be more permissive for base64 data
      if (!isValidImageUri(uri) && !uri.startsWith('data:image/')) {
        console.log('❌ Invalid image URI:', uri);
        setError(true);
        setLoading(false);
        return;
      }

      // Start loading metrics
      metrics.startLoading(uri);

      // Optimize the image
      const optimized = optimizeImageUri(uri, {
        width: optimizationOptions.width,
        height: optimizationOptions.height,
        quality: optimizationOptions.quality || 0.8,
      });

      setOptimizedSource(optimized);
    } else {
      setOptimizedSource(source);
    }
  }, [source, enableOptimization, optimizationOptions]);

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
    setLoading(false);
    setError(false);
    
    // End loading metrics
    if (source && typeof source === 'object' && 'uri' in source) {
      metrics.endLoading(source.uri, true);
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    
    // End loading metrics
    if (source && typeof source === 'object' && 'uri' in source) {
      metrics.endLoading(source.uri, false);
    }
    
    onError?.();
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

    const IconComponent = fallbackIcon === 'home' ? Home : ImageIcon;

    return (
      <View style={[styles.fallback, style, { borderRadius: borderRadius || 0 }]}>
        <IconComponent size={48} color="#9CA3AF" />
      </View>
    );
  };

  const renderImage = () => {
    if (error) return null;

    return (
      <Animated.Image
        source={optimizedSource}
        style={[
          style,
          {
            opacity: fadeAnim,
            borderRadius: borderRadius || 0,
            width: '100%',
            height: '100%',
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
    width: '100%',
    height: '100%',
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
  },
});

export default LoadingImage;
