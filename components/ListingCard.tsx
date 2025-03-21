import React from "react";
import { View, Text, Image, TouchableOpacity, useWindowDimensions } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Star, Home, Heart, Ruler } from "lucide-react-native";

export type ListingType = {
    image: string;
    title: string;
    location: string;
    rating: number; 
    reviews: number;
    rooms: number;
    size: number;
    price: number;
};

const ListingCard: React.FC<ListingType> = ({ image, title, location, rating, reviews, rooms, size, price }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    return (
        <Box className="flex-row bg-white rounded-2xl border border-gray-300 shadow-md overflow-hidden w-full max-w-sm h-[180px]">
            {/* Left Side - Image */}
            <View className="w-32">
                <Image 
                    source={{ uri: image }} 
                    className="w-full h-full"
                    resizeMode="cover"
                />
            </View>

            {/* Right Side - Details */}
            <VStack className="flex-1 p-4 justify-between">
                <VStack className="space-y-1">
                    {/* Rating */}
                    <HStack className="items-center space-x-1">
                        <Icon as={Star} size="sm" color="#FACC15" />
                        <Text className="text-sm font-bold">
                            {rating} <Text className="text-xs text-gray-500">({reviews})</Text>
                        </Text>
                    </HStack>

                    {/* Title */}
                    <Text 
                        className="text-lg font-bold" 
                        numberOfLines={2}
                        style={{ lineHeight: 24 }}
                    >
                        {title}
                    </Text>

                    {/* Location */}
                    <Text className="text-sm text-gray-500" numberOfLines={1}>
                        {location}
                    </Text>
                </VStack>

                <VStack className="space-y-2">
                    {/* Features */}
                    <HStack className="items-center space-x-4">
                        <HStack className="items-center space-x-1">
                            <Icon as={Home} size="sm" color="#6B7280" />
                            <Text className="text-sm">{rooms} room</Text>
                        </HStack>
                        <HStack className="items-center space-x-1">
                            <Icon as={Ruler} size="sm" color="#6B7280" />
                            <Text className="text-sm">{size} m²</Text>
                        </HStack>
                    </HStack>

                    {/* Price & Favorite */}
                    <HStack className="justify-between items-center">
                        <Text className="text-lg font-bold">
                            ₱{price} <Text className="text-sm text-gray-500">/ month</Text>
                        </Text>
                        <TouchableOpacity>
                            <Icon as={Heart} size="md" color="#6B7280" />
                        </TouchableOpacity>
                    </HStack>
                </VStack>
            </VStack>
        </Box>
    );
};

export default ListingCard;
