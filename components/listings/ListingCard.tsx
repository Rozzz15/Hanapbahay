import React from "react";
import { View, Text, Image, TouchableOpacity, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Star, Home, Heart, Ruler, MapPin } from "lucide-react-native";

export type ListingType = {
    id?: string;
    image: string;
    title: string;
    location: string;
    rating: number; 
    reviews: number;
    rooms: number;
    size: number;
    price: number;
    ownerUserId?: string;
    description?: string;
    amenities?: string[];
    photos?: string[];
    // Additional property data
    propertyType?: string;
    rentalType?: string;
    availabilityStatus?: string;
    leaseTerm?: string;
    baseRent?: number;
    securityDeposit?: number;
    paymentMethods?: string[];
    ownerName?: string;
    businessName?: string;
    contactNumber?: string;
    email?: string;
    emergencyContact?: string;
    rules?: string[];
    videos?: string[];
    coverPhoto?: string;
    publishedAt?: string;
};

const ListingCard: React.FC<ListingType> = ({ 
    id, 
    image, 
    title, 
    location, 
    rating, 
    reviews, 
    rooms, 
    size, 
    price, 
    ownerUserId,
    description,
    amenities,
    photos,
    // Additional property data
    propertyType,
    rentalType,
    availabilityStatus,
    leaseTerm,
    baseRent,
    securityDeposit,
    paymentMethods,
    ownerName,
    businessName,
    contactNumber,
    email,
    emergencyContact,
    rules,
    videos,
    coverPhoto,
    publishedAt
}) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const router = useRouter();

    const handleViewDetails = () => {
        // Navigate to property preview with the listing data
        router.push({
            pathname: '/property-preview',
            params: {
                id: id || 'unknown',
                title,
                location,
                price: price.toString(),
                rooms: rooms.toString(),
                size: size.toString(),
                rating: rating.toString(),
                reviews: reviews.toString(),
                image,
                ownerUserId: ownerUserId || '',
                description: description || 'Beautiful property in a great location.',
                amenities: amenities ? JSON.stringify(amenities) : JSON.stringify(['WiFi', 'Parking', 'Air Conditioning']),
                photos: photos ? JSON.stringify(photos) : JSON.stringify([image]),
                // Pass all additional property data
                propertyType: propertyType || '',
                rentalType: rentalType || '',
                availabilityStatus: availabilityStatus || 'Available',
                leaseTerm: leaseTerm || 'Not specified',
                monthlyRent: price.toString(),
                baseRent: baseRent?.toString() || '',
                securityDeposit: securityDeposit?.toString() || '',
                paymentMethods: paymentMethods ? JSON.stringify(paymentMethods) : '',
                ownerName: ownerName || 'Property Owner',
                businessName: businessName || '',
                contactNumber: contactNumber || 'Contact not provided',
                email: email || 'Email not provided',
                emergencyContact: emergencyContact || '',
                rules: rules ? JSON.stringify(rules) : '',
                videos: videos ? JSON.stringify(videos) : '',
                coverPhoto: coverPhoto || '',
                publishedAt: publishedAt || ''
            }
        });
    };

    return (
        <TouchableOpacity className="w-full mb-4" onPress={handleViewDetails}>
            <Box className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Image Section */}
                <View className="relative">
                    <Image 
                        source={{ uri: coverPhoto || image }} 
                        className="w-full h-48"
                        resizeMode="cover"
                        onError={(error) => {
                            console.log('❌ Listing card image load error:', error.nativeEvent.error);
                            console.log('📸 Attempted to load:', coverPhoto || image);
                        }}
                        onLoad={() => {
                            console.log('✅ Listing card image loaded successfully:', coverPhoto || image);
                        }}
                    />
                    
                    {/* Cover Photo Indicator */}
                    {coverPhoto && (
                        <View className="absolute top-3 right-12 bg-yellow-500 px-2 py-1 rounded-full">
                            <Text className="text-white text-xs font-bold">⭐ Cover</Text>
                        </View>
                    )}
                    
                    {/* Rating Badge */}
                    <View className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                        <HStack className="items-center space-x-1">
                            <Icon as={Star} size="xs" color="#F59E0B" />
                            <Text className="text-xs font-semibold text-gray-800">
                                {rating} <Text className="text-gray-500">({reviews})</Text>
                            </Text>
                        </HStack>
                    </View>
                    {/* Favorite Button */}
                    <TouchableOpacity className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2">
                        <Icon as={Heart} size="sm" color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Content Section */}
                <VStack className="p-5 space-y-3">
                    {/* Title */}
                    <Text 
                        className="text-xl font-bold text-gray-900" 
                        numberOfLines={2}
                        style={{ lineHeight: 28 }}
                    >
                        {title}
                    </Text>

                    {/* Location */}
                    <HStack className="items-center space-x-2">
                        <Icon as={MapPin} size="sm" color="#6B7280" />
                        <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
                            {location}
                        </Text>
                    </HStack>


                    {/* Price Section */}
                    <HStack className="justify-between items-center pt-2 border-t border-gray-100">
                        <VStack>
                            <Text className="text-2xl font-bold text-gray-900">
                                ₱{price.toLocaleString()}
                            </Text>
                            <Text className="text-sm text-gray-500">per month</Text>
                        </VStack>
                        <HStack className="items-center space-x-2">
                            {ownerUserId && (
                                <TouchableOpacity 
                                    className="bg-green-600 rounded-xl px-4 py-3"
                                    onPress={() => router.push({ pathname: '/chat-room', params: { name: title, otherUserId: ownerUserId } })}
                                >
                                    <Text className="text-white font-semibold text-sm">Message Owner</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                className="bg-blue-600 rounded-xl px-6 py-3"
                                onPress={(e) => {
                                    e.stopPropagation(); // Prevent card click
                                    handleViewDetails();
                                }}
                            >
                                <Text className="text-white font-semibold text-sm">View Details</Text>
                            </TouchableOpacity>
                        </HStack>
                    </HStack>
                </VStack>
            </Box>
        </TouchableOpacity>
    );
};

export default ListingCard;
