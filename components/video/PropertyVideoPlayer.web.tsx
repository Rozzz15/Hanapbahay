import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Play, Pause, X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface PropertyVideoPlayerProps {
  videos: string[];
  visible: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PropertyVideoPlayer({ 
  videos, 
  visible, 
  onClose, 
  initialIndex = 0 
}: PropertyVideoPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setError(null);
      setIsPlaying(false);
      setIsLoading(true);
    } else {
      // Pause video when modal closes
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsLoading(false);
    }
  }, [visible, initialIndex]);

  // Handle video index change
  useEffect(() => {
    if (videoRef.current && videos[currentIndex]) {
      setIsLoading(true);
      setError(null);
      videoRef.current.load();
    }
  }, [currentIndex, videos]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setError('Failed to control playback');
    }
  };

  const goToPrevious = () => {
    if (videos.length <= 1) return;
    setCurrentIndex(prev => prev === 0 ? videos.length - 1 : prev - 1);
  };

  const goToNext = () => {
    if (videos.length <= 1) return;
    setCurrentIndex(prev => prev === videos.length - 1 ? 0 : prev + 1);
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setError('Failed to load video');
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  // Early return after all hooks have been called
  if (!visible || videos.length === 0) {
    return null;
  }

  const currentVideo = videos[currentIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {videos.length}
          </Text>
        </View>
        
        <View style={styles.spacer} />
      </View>

      {/* Video Content */}
      <View style={styles.videoContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : currentVideo ? (
          <TouchableOpacity 
            style={styles.videoWrapper}
            onPress={handlePlayPause}
            activeOpacity={1}
          >
            <video
              ref={videoRef}
              src={currentVideo}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: 'black',
              }}
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              playsInline
            />
            {!isLoading && !isPlaying && !error && (
              <View style={styles.playOverlay}>
                <View style={styles.playOverlayButton}>
                  <Play size={48} color="white" />
                </View>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No video available</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, videos.length <= 1 && styles.disabledButton]}
          onPress={goToPrevious}
          disabled={videos.length <= 1}
        >
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          {isPlaying ? (
            <Pause size={32} color="white" />
          ) : (
            <Play size={32} color="white" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, videos.length <= 1 && styles.disabledButton]}
          onPress={goToNext}
          disabled={videos.length <= 1}
        >
          <ChevronRight size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Dots Indicator */}
      {videos.length > 1 && (
        <View style={styles.dotsContainer}>
          {videos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  counterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    width: 40,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 32,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  disabledButton: {
    opacity: 0.3,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeDot: {
    width: 36,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
});




