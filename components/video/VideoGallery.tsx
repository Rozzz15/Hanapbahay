import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Play } from 'lucide-react-native';

interface VideoGalleryProps {
  videos: string[];
  onVideoPress: (index: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function VideoGallery({ videos, onVideoPress }: VideoGalleryProps) {
  if (!videos || videos.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎥 Property Videos</Text>
        <Text style={styles.noVideosText}>No videos available for this property.</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        🎥 Property Videos ({videos.length})
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={screenWidth * 0.6 + 16}
        snapToAlignment="start"
        pagingEnabled={false}
        bounces={true}
        alwaysBounceHorizontal={true}
        scrollEventThrottle={16}
      >
        {videos.map((video, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.videoItem}
            onPress={() => onVideoPress(index)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: video }}
              style={styles.videoThumbnail}
              resizeMode="cover"
              onError={(error) => {
                console.error('Video thumbnail load error:', error);
              }}
            />
            <View style={styles.videoOverlay}>
              <View style={styles.playIconCircle}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
            <View style={styles.videoIndicator}>
              <Text style={styles.videoIndicatorText}>
                {index + 1}/{videos.length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  noVideosText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  scrollView: {
    flexDirection: 'row',
  },
  scrollContent: {
    paddingRight: 16,
    paddingLeft: 4,
  },
  videoItem: {
    marginRight: 16,
    position: 'relative',
    width: screenWidth * 0.6,
    height: 200,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#000000',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
  },
  playIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  videoIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
