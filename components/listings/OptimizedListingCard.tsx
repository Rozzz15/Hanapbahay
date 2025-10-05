import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Star } from 'lucide-react-native';

interface OptimizedListingCardProps {
  id: string;
  image: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  rooms: number;
  size: number;
  price: number;
  onPress: (id: string) => void;
}

export const OptimizedListingCard = memo<OptimizedListingCardProps>(({
  id,
  image,
  title,
  location,
  rating,
  reviews,
  rooms,
  size,
  price,
  onPress
}) => {
  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  const formattedPrice = useMemo(() => {
    return `₱${price.toLocaleString()}`;
  }, [price]);

  const ratingText = useMemo(() => {
    return `${rating} (${reviews})`;
  }, [rating, reviews]);

  return (
    <TouchableOpacity 
      className="w-full mb-4" 
      onPress={handlePress}
    >
      <View className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <View className="relative">
          <Image 
            source={{ uri: image }} 
            className="w-full h-48"
            resizeMode="cover"
          />
          <View className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
            <View className="flex-row items-center">
              <Star size={14} color="#F59E0B" />
              <Text className="ml-1 text-sm font-semibold text-gray-800">
                {ratingText}
              </Text>
            </View>
          </View>
        </View>
        
        <View className="p-5">
          <Text className="text-xl font-bold text-gray-800 mb-2" numberOfLines={2}>
            {title}
          </Text>
          
          <Text className="text-gray-600 mb-3" numberOfLines={1}>
            {location}
          </Text>
          
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-green-600">
              {formattedPrice}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

OptimizedListingCard.displayName = 'OptimizedListingCard';
