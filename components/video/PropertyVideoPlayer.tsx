import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Animated } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
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
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapHintOpacity = useRef(new Animated.Value(0)).current;

  // Initialize video player with current video
  const currentVideo = videos.length > 0 && videos[currentIndex] ? videos[currentIndex] : null;
  
  // Initialize video player
  const videoPlayer = useVideoPlayer(currentVideo, (player) => {
    if (!player) {
      console.log('Video player not initialized');
      return;
    }

    console.log('Video player initialized with:', currentVideo);
    player.loop = false;
    player.muted = false;

    // Add event listeners
    player.addListener('statusChange', (event: any) => {
      console.log('Video status change:', event);
      // Extract status from event object - it could be event.status or the event itself might be the status string
      const status = typeof event === 'string' ? event : (event?.status || (event as any)?.status || '');
      
      if (status === 'readyToPlay') {
        console.log('Video ready to play, starting playback');
        setIsLoading(false);
        setError(null);
        // Clear loading timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        // Auto-play when ready
        player.play();
      } else if (status === 'error') {
        console.log('Video error occurred');
        setIsLoading(false);
        setError('Failed to load video');
        // Clear loading timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      } else if (status === 'loading') {
        console.log('Video loading...');
        setIsLoading(true);
      } else if (status === 'idle') {
        console.log('Video is idle');
        setIsLoading(false);
      }
    });

    // Use playbackStatusUpdate if available, otherwise poll player status
    try {
      player.addListener('playbackStatusUpdate' as any, (event: any) => {
        console.log('Playback status update:', event);
        const isPlaying = event?.isPlaying ?? player.playing;
        setIsPlaying(isPlaying);
        
        // Clear loading state when video starts playing
        if (isPlaying && isLoading) {
          console.log('Video started playing, clearing loading state');
          setIsLoading(false);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
        }
        
        // Show tap hint when video starts playing
        if (isPlaying) {
          showTapHint();
        } else {
          hideTapHint();
        }
      });
    } catch (err) {
      // If playbackStatusUpdate doesn't exist, poll the player status
      console.log('playbackStatusUpdate event not available, using polling');
    }
  });

  // Update video when index changes
  useEffect(() => {
    const loadVideo = async () => {
      if (videoPlayer && videos.length > 0 && videos[currentIndex]) {
        setError(null);
        setIsLoading(true);
        setIsPlaying(false);
        
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        
        // Set a timeout to handle loading issues
        loadingTimeoutRef.current = setTimeout(() => {
          if (isLoading) {
            console.log('Video loading timeout, showing error');
            setError('Video took too long to load. Please try again.');
            setIsLoading(false);
          }
        }, 10000); // 10 second timeout
        
        try {
          await videoPlayer.replaceAsync(videos[currentIndex]);
        } catch (err) {
          console.error('Error loading video:', err);
          setError('Failed to load video');
          setIsLoading(false);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
        }
      }
    };

    loadVideo();
    
    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [currentIndex, videos, videoPlayer, isLoading]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setError(null);
      setIsPlaying(false);
      setIsLoading(true);
      
      // Fallback: Clear loading state after 5 seconds to prevent stuck loading
      const fallbackTimeout = setTimeout(() => {
        console.log('Fallback: Clearing loading state after timeout');
        setIsLoading(false);
      }, 5000);
      
      return () => clearTimeout(fallbackTimeout);
    } else {
      // Pause video when modal closes
      if (videoPlayer) {
        videoPlayer.pause();
      }
      // Reset loading state when modal closes
      setIsLoading(false);
    }
  }, [visible, initialIndex, videoPlayer]);

  // Animation functions for tap hint
  const showTapHint = () => {
    Animated.sequence([
      Animated.timing(tapHintOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(tapHintOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideTapHint = () => {
    Animated.timing(tapHintOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePlayPause = () => {
    if (!videoPlayer) return;

    try {
      if (isPlaying) {
        videoPlayer.pause();
      } else {
        videoPlayer.play();
        // Clear loading state when manually starting playback
        if (isLoading) {
          console.log('Manually starting playback, clearing loading state');
          setIsLoading(false);
        }
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

  const handleRetry = async () => {
    setError(null);
    setIsLoading(true);
    if (videoPlayer && videos[currentIndex]) {
      try {
        await videoPlayer.replaceAsync(videos[currentIndex]);
      } catch (err) {
        console.error('Error retrying video:', err);
        setError('Failed to retry video');
        setIsLoading(false);
      }
    }
  };

  // Early return after all hooks have been called
  if (!visible || videos.length === 0) {
    console.log('Video player not visible or no videos:', { visible, videosLength: videos.length });
    return null;
  }

  console.log('Video player rendering with:', {
    visible,
    videosLength: videos.length,
    currentIndex,
    currentVideo,
    isLoading,
    isPlaying,
    error,
    allVideos: videos
  });

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
        ) : videoPlayer && currentVideo ? (
          <TouchableOpacity 
            style={styles.videoWrapper}
            onPress={handlePlayPause}
            activeOpacity={1}
          >
            <VideoView
              player={videoPlayer}
              style={styles.video}
              nativeControls={false}
              contentFit="contain"
              allowsPictureInPicture={false}
            />
            {!isLoading && !isPlaying && !error && (
              <View style={styles.playOverlay}>
                <View style={styles.playOverlayButton}>
                  <Play size={48} color="white" />
                </View>
              </View>
            )}
            {/* Tap indicator overlay */}
            {isPlaying && (
              <Animated.View style={[styles.tapOverlay, { opacity: tapHintOpacity }]} pointerEvents="none">
                <Text style={styles.tapHintText}>Tap to pause</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {!currentVideo ? 'No video available' : 'Video player not available'}
            </Text>
            {!currentVideo && (
              <Text style={styles.errorSubtext}>
                Please check if the video URL is valid
              </Text>
            )}
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
  video: {
    width: '100%',
    height: '100%',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tapOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  tapHintText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
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
  errorSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
