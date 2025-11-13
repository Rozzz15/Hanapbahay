import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number; // Current rating (0-5)
  maxRating?: number; // Maximum rating (default 5)
  size?: number; // Star size (default 20)
  interactive?: boolean; // Allow user to select rating (default false)
  onRatingChange?: (rating: number) => void; // Callback when rating changes
  showCount?: boolean; // Show review count (default false)
  reviewCount?: number; // Number of reviews
  color?: string; // Active star color (default #F59E0B)
  inactiveColor?: string; // Inactive star color (default #D1D5DB)
  style?: any; // Additional container styles
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  showCount = false,
  reviewCount = 0,
  color = '#F59E0B',
  inactiveColor = '#D1D5DB',
  style
}: StarRatingProps) {
  const stars = [];

  const handleStarPress = (selectedRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(selectedRating);
    }
  };

  for (let i = 1; i <= maxRating; i++) {
    const starContent = (
      <Ionicons
        name={i <= rating ? 'star' : 'star-outline'}
        size={size}
        color={i <= rating ? color : inactiveColor}
      />
    );

    if (interactive) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          activeOpacity={0.7}
          style={styles.starButton}
        >
          {starContent}
        </TouchableOpacity>
      );
    } else {
      stars.push(
        <View key={i} style={styles.star}>
          {starContent}
        </View>
      );
    }
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {stars}
      </View>
      {showCount ? (
        <Text style={[styles.countText, { fontSize: size * 0.7 }]}>
          ({String(reviewCount || 0)})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  starButton: {
    marginRight: 2,
    padding: 4,
  },
  countText: {
    marginLeft: 6,
    color: '#6B7280',
    fontWeight: '600',
  },
});

