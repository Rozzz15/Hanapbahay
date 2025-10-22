import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import LoadingImage from './LoadingImage';

interface ImageGalleryProps {
  images: string[];
  coverImage?: string;
  style?: any;
  imageStyle?: any;
  showThumbnails?: boolean;
  maxThumbnails?: number;
  onImagePress?: (imageUri: string, index: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  coverImage,
  style,
  imageStyle,
  showThumbnails = true,
  maxThumbnails = 5,
  onImagePress
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Combine cover image with other images
  const allImages = React.useMemo(() => {
    const imageList = [...images];
    if (coverImage && !imageList.includes(coverImage)) {
      imageList.unshift(coverImage);
    }
    return imageList.filter(Boolean);
  }, [images, coverImage]);

  const handleImagePress = (imageUri: string, index: number) => {
    setCurrentIndex(index);
    if (onImagePress) {
      onImagePress(imageUri, index);
    } else {
      setShowFullscreen(true);
    }
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const renderThumbnails = () => {
    if (!showThumbnails || allImages.length <= 1) return null;

    const thumbnailsToShow = allImages.slice(0, maxThumbnails);
    const remainingCount = allImages.length - maxThumbnails;

    return (
      <View style={styles.thumbnailsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailsScroll}
        >
          {thumbnailsToShow.map((imageUri, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.thumbnail,
                index === currentIndex && styles.activeThumbnail
              ]}
              onPress={() => setCurrentIndex(index)}
            >
              <LoadingImage
                source={{ uri: imageUri }}
                style={styles.thumbnailImage}
                resizeMode="cover"
                borderRadius={8}
                showSkeleton={false}
              />
            </TouchableOpacity>
          ))}
          
          {remainingCount > 0 && (
            <TouchableOpacity
              style={styles.moreThumbnail}
              onPress={() => setCurrentIndex(maxThumbnails)}
            >
              <View style={styles.moreThumbnailContent}>
                <View style={styles.moreThumbnailText}>
                  +{remainingCount}
                </View>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderFullscreenModal = () => {
    if (!showFullscreen) return null;

    return (
      <View style={styles.fullscreenModal}>
        <View style={styles.fullscreenHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFullscreen(false)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.imageCounter}>
            <View style={styles.imageCounterBackground}>
              <View style={styles.imageCounterText}>
                {currentIndex + 1} / {allImages.length}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.fullscreenImageContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={prevImage}
            disabled={allImages.length <= 1}
          >
            <ChevronLeft size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => setShowFullscreen(false)}
          >
            <LoadingImage
              source={{ uri: allImages[currentIndex] }}
              style={styles.fullscreenImage}
              resizeMode="contain"
              showSkeleton={true}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={nextImage}
            disabled={allImages.length <= 1}
          >
            <ChevronRight size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {allImages.length > 1 && (
          <View style={styles.fullscreenThumbnails}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fullscreenThumbnailsScroll}
            >
              {allImages.map((imageUri, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.fullscreenThumbnail,
                    index === currentIndex && styles.fullscreenActiveThumbnail
                  ]}
                  onPress={() => setCurrentIndex(index)}
                >
                  <LoadingImage
                    source={{ uri: imageUri }}
                    style={styles.fullscreenThumbnailImage}
                    resizeMode="cover"
                    borderRadius={4}
                    showSkeleton={false}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  if (allImages.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <LoadingImage
          source={{ uri: '' }}
          style={[styles.mainImage, imageStyle]}
          resizeMode="cover"
          fallbackIcon="home"
          showSkeleton={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.mainImageContainer}
        onPress={() => handleImagePress(allImages[currentIndex], currentIndex)}
        activeOpacity={0.9}
      >
        <LoadingImage
          source={{ uri: allImages[currentIndex] }}
          style={[styles.mainImage, imageStyle]}
          resizeMode="cover"
          showSkeleton={true}
        />
        
        {allImages.length > 1 && (
          <View style={styles.imageCounter}>
            <View style={styles.imageCounterBackground}>
              <View style={styles.imageCounterText}>
                {currentIndex + 1} / {allImages.length}
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {renderThumbnails()}
      {renderFullscreenModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mainImageContainer: {
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: 200,
  },
  thumbnailsContainer: {
    marginTop: 8,
  },
  thumbnailsScroll: {
    paddingHorizontal: 4,
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: '#3B82F6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  moreThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreThumbnailContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreThumbnailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  imageCounterBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Fullscreen modal styles
  fullscreenModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
  },
  fullscreenHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    zIndex: 1001,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  imageContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    maxHeight: screenWidth * 0.8,
  },
  fullscreenThumbnails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 10,
  },
  fullscreenThumbnailsScroll: {
    paddingHorizontal: 16,
  },
  fullscreenThumbnail: {
    width: 50,
    height: 50,
    marginRight: 8,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fullscreenActiveThumbnail: {
    borderColor: '#FFFFFF',
  },
  fullscreenThumbnailImage: {
    width: '100%',
    height: '100%',
  },
});

export default ImageGallery;
