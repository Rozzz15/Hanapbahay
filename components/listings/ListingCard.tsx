import React, { useState, useEffect, memo } from "react";
import { View, Text, TouchableOpacity, useWindowDimensions, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Star, Home, MapPin, Users, Heart } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { trackListingView } from "@/utils/view-tracking";
import { createOrFindConversation } from "@/utils/conversation-utils";
import { showAlert } from "@/utils/alert";
import { toggleFavorite, isFavorite } from "@/utils/favorites";
import { addCustomEventListener } from "@/utils/custom-events";

export type ListingType = {
    id?: string;
    image: string;
    coverPhoto?: string;
    title: string;
    location: string;
    rating: number; 
    reviews: number;
    rooms: number;
    bathrooms: number;
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
    paymentMethods?: string[];
    ownerName?: string;
    businessName?: string;
    contactNumber?: string;
    email?: string;
    emergencyContact?: string;
    rules?: string[];
    videos?: string[];
    publishedAt?: string;
    capacity?: number; // Maximum number of tenants/slots
    occupiedSlots?: number; // Current number of occupied slots
    roomCapacities?: number[]; // Capacity per room
    roomAvailability?: number[]; // Available slots per room
};

const ListingCard: React.FC<ListingType> = ({ 
    id, 
    image, 
    title, 
    location, 
    rating, 
    reviews, 
    rooms, 
    bathrooms,
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
    paymentMethods,
    ownerName,
    businessName,
    contactNumber,
    email,
    emergencyContact,
    rules,
    videos,
    coverPhoto,
    publishedAt,
    capacity,
    occupiedSlots,
    roomCapacities,
    roomAvailability
}) => {
    console.log('🖼️ ListingCard received props:', {
        id,
        image,
        coverPhoto,
        hasImage: !!image,
        hasCoverPhoto: !!coverPhoto,
        imageValue: image,
        coverPhotoValue: coverPhoto
    });
    
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [isFavorited, setIsFavorited] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    // Load favorite status
    useEffect(() => {
        const loadFavoriteStatus = async () => {
            if (!user?.id || !id) return;
            try {
                const favoriteStatus = await isFavorite(user.id, id);
                setIsFavorited(favoriteStatus);
            } catch (error) {
                console.error('Error loading favorite status:', error);
            }
        };
        loadFavoriteStatus();
    }, [user?.id, id]);

    // Listen for favorite changes from other components
    useEffect(() => {
        if (!user?.id || !id) return;
        
        const handleFavoriteChange = async () => {
            try {
                const favoriteStatus = await isFavorite(user.id, id);
                setIsFavorited(favoriteStatus);
            } catch (error) {
                console.error('Error checking favorite status:', error);
            }
        };

        const unsubscribe = addCustomEventListener('favoriteChanged', handleFavoriteChange);
        return unsubscribe;
    }, [user?.id, id]);

    // Toggle favorite handler
    const handleToggleFavorite = async (e: any) => {
        e.stopPropagation(); // Prevent card click
        
        if (!user?.id) {
            showAlert('Login Required', 'Please log in to save favorites.');
            return;
        }

        if (!id) {
            showAlert('Error', 'Property ID not found.');
            return;
        }

        try {
            setIsToggling(true);
            const newFavoriteStatus = await toggleFavorite(user.id, id);
            setIsFavorited(newFavoriteStatus);
        } catch (error) {
            console.error('Error toggling favorite:', error);
            showAlert('Error', 'Failed to update favorite. Please try again.');
        } finally {
            setIsToggling(false);
        }
    };

    const handleViewDetails = async () => {
        // Navigate immediately - track view in background
        router.push({
            pathname: '/property-preview',
            params: {
                id: id || 'unknown',
                title,
                location,
                price: price.toString(),
                rooms: rooms.toString(),
                bathrooms: bathrooms.toString(),
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
                securityDeposit: '',
                paymentMethods: paymentMethods ? JSON.stringify(paymentMethods) : '',
                ownerName: ownerName || 'Property Owner',
                businessName: businessName || '',
                contactNumber: contactNumber || 'Contact not provided',
                email: email || 'Email not provided',
                emergencyContact: emergencyContact || '',
                rules: rules ? JSON.stringify(rules) : '',
                videos: videos ? JSON.stringify(videos) : '',
                coverPhoto: coverPhoto || image || '',
                publishedAt: publishedAt || ''
            }
        });
    };

    return (
        <TouchableOpacity style={styles.cardWrapper} onPress={handleViewDetails}>
            <Box 
                key={`listing-${id}-${coverPhoto || image}`}
                style={styles.cardContainer}
            >
                {/* Image Section */}
                <View style={styles.imageContainer}>
                    <Image 
                        source={{ 
                            uri: (() => {
                                // Only use user-uploaded photos, no default fallbacks
                                const imageUri = coverPhoto || image;
                                console.log('🖼️ ListingCard image source:', {
                                    coverPhoto,
                                    image,
                                    finalUri: imageUri,
                                    hasCoverPhoto: !!coverPhoto,
                                    hasImage: !!image
                                });
                                return imageUri;
                            })()
                        }} 
                        style={styles.cardImage}
                        resizeMode="cover"
                        showSkeleton={true}
                        fallbackIcon="home"
                        borderRadius={0}
                        onError={(error) => {
                            console.log('❌ Listing card image load error:', error);
                            console.log('📸 Attempted to load:', coverPhoto || image);
                            console.log('📸 Cover photo value:', coverPhoto);
                            console.log('📸 Image value:', image);
                        }}
                        onLoad={() => {
                            console.log('✅ Listing card image loaded successfully:', coverPhoto || image);
                        }}
                    />
                    
                    
                    {/* Rating Badge */}
                    <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4 }}>
                        <HStack style={{ alignItems: 'center', gap: 4 }}>
                            <Star size={14} color={rating > 0 ? "#F59E0B" : "#D1D5DB"} />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>
                                {rating > 0 ? rating.toFixed(1) : 'No ratings'}{rating > 0 && ` (${reviews})`}
                            </Text>
                        </HStack>
                    </View>
                    
                    {/* Favorite Heart Button */}
                    {isAuthenticated && user?.id && (
                        <TouchableOpacity
                            onPress={handleToggleFavorite}
                            disabled={isToggling}
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                borderRadius: 9999,
                                padding: 8,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                            activeOpacity={0.7}
                        >
                            <Heart 
                                size={20} 
                                color={isFavorited ? "#EF4444" : "#6B7280"} 
                                fill={isFavorited ? "#EF4444" : "none"}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Content Section */}
                <VStack style={{ padding: 20, gap: 12 }}>
                    {/* Title */}
                    <Text 
                        style={styles.title}
                        numberOfLines={2}
                    >
                        {title}
                    </Text>

                    {/* Location */}
                    <HStack style={{ alignItems: 'center', gap: 8 }}>
                        <MapPin size={16} color="#6B7280" />
                        <Text style={{ fontSize: 14, color: '#4B5563', flex: 1 }} numberOfLines={1}>
                            {location}
                        </Text>
                    </HStack>

                    {/* Owner/Business Name */}
                    {(businessName || ownerName) && (
                        <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                            <Home size={16} color="#3B82F6" />
                            <Text style={{ fontSize: 14, fontWeight: '500', color: '#1D4ED8', flex: 1 }} numberOfLines={1}>
                                {businessName || ownerName}
                            </Text>
                        </HStack>
                    )}

                    {/* Capacity/Slots Information */}
                    {capacity !== undefined && (
                        <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5' }}>
                            <HStack style={{ alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <Users size={16} color="#10B981" />
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>Capacity</Text>
                            </HStack>
                            {occupiedSlots !== undefined 
                                ? (() => {
                                    const available = capacity - occupiedSlots;
                                    const percentage = Math.round((available / capacity) * 100);
                                    
                                    return (
                                        <VStack style={{ gap: 6 }}>
                                            <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Total Capacity:</Text>
                                                <Text style={{ fontSize: 12, color: '#111827', fontWeight: '700' }}>
                                                    {capacity} {capacity === 1 ? 'slot' : 'slots'}
                                                </Text>
                                            </HStack>
                                            <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Occupied:</Text>
                                                <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '700' }}>
                                                    {occupiedSlots} {occupiedSlots === 1 ? 'slot' : 'slots'}
                                                </Text>
                                            </HStack>
                                            <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Available:</Text>
                                                <Text style={{ 
                                                    fontSize: 12, 
                                                    color: available === 0 ? '#EF4444' : '#10B981', 
                                                    fontWeight: '700' 
                                                }}>
                                                    {available} {available === 1 ? 'slot' : 'slots'} ({percentage}%)
                                                </Text>
                                            </HStack>
                                        </VStack>
                                    );
                                })()
                                : (
                                    <VStack style={{ gap: 6 }}>
                                        <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Total Capacity:</Text>
                                            <Text style={{ fontSize: 12, color: '#111827', fontWeight: '700' }}>
                                                {capacity} {capacity === 1 ? 'slot' : 'slots'}
                                            </Text>
                                        </HStack>
                                        <Text style={{ fontSize: 11, color: '#10B981', fontStyle: 'italic', marginTop: 4 }}>
                                            Ready for occupancy
                                        </Text>
                                    </VStack>
                                )
                            }
                            {/* Room Capacity Breakdown */}
                            {roomCapacities && roomCapacities.length > 0 && (
                                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#D1FAE5' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981', marginBottom: 6 }}>
                                        Room Availability:
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'nowrap', gap: 8, alignItems: 'flex-start' }}>
                                        {roomCapacities.map((roomCap, index) => {
                                            const available = roomAvailability && roomAvailability[index] !== undefined 
                                                ? roomAvailability[index] 
                                                : roomCap; // Fallback to full capacity if availability not provided
                                            const occupied = roomCap - available;
                                            const isFullyOccupied = available === 0;
                                            
                                            return (
                                                <View 
                                                    key={index}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                        backgroundColor: isFullyOccupied ? '#FEF2F2' : '#FFFFFF',
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 6,
                                                        borderRadius: 6,
                                                        borderWidth: 1,
                                                        borderColor: isFullyOccupied ? '#FEE2E2' : '#D1FAE5',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Text style={{ 
                                                        fontSize: 10, 
                                                        color: isFullyOccupied ? '#DC2626' : '#10B981', 
                                                        fontWeight: '500',
                                                        textAlign: 'center'
                                                    }} numberOfLines={2}>
                                                        Room {index + 1}: {available}/{roomCap}
                                                    </Text>
                                                    <Text style={{ 
                                                        fontSize: 9, 
                                                        color: isFullyOccupied ? '#DC2626' : '#10B981', 
                                                        fontWeight: '400',
                                                        textAlign: 'center',
                                                        marginTop: 2
                                                    }} numberOfLines={1}>
                                                        {available === 1 ? 'slot' : 'slots'} available
                                                    </Text>
                                                    {isFullyOccupied && (
                                                        <Text style={{ 
                                                            fontSize: 9, 
                                                            color: '#DC2626', 
                                                            fontWeight: '600',
                                                            marginTop: 2,
                                                            textAlign: 'center'
                                                        }}>
                                                            Fully Occupied
                                                        </Text>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Price Section */}
                    <HStack style={{ justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                        <VStack>
                            <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                                ₱{price.toLocaleString()}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#6B7280' }}>per month</Text>
                        </VStack>
                        <HStack style={{ alignItems: 'center', gap: 8 }}>
                            {(() => {
                                // Get ownerUserId - check if it exists and is not empty
                                const validOwnerUserId = (ownerUserId && ownerUserId.trim() !== '') ? ownerUserId : null;
                                
                                if (!validOwnerUserId) {
                                    return null; // Don't show button if no valid ownerUserId
                                }
                                
                                return (
                                    <TouchableOpacity 
                                        style={styles.messageButton}
                                        onPress={async (e) => {
                                            e.stopPropagation(); // Prevent card click
                                            
                                            if (!user?.id) {
                                                showAlert('Error', 'Please log in to message the owner.');
                                                return;
                                            }

                                            if (!validOwnerUserId || validOwnerUserId.trim() === '') {
                                                showAlert('Error', 'Unable to identify property owner. Please try again.');
                                                return;
                                            }

                                            const displayName = businessName || ownerName || title;
                                            
                                            try {
                                                console.log('💬 Starting conversation with owner from listing card:', validOwnerUserId);
                                                
                                                // Create or find conversation
                                                const conversationId = await createOrFindConversation({
                                                    ownerId: validOwnerUserId,
                                                    tenantId: user.id,
                                                    ownerName: displayName,
                                                    tenantName: user.name || 'Tenant',
                                                    propertyId: id || '',
                                                    propertyTitle: title
                                                });

                                                console.log('✅ Created/found conversation:', conversationId);

                                                // Navigate to chat room with conversation ID
                                                router.push({
                                                    pathname: '/chat-room',
                                                    params: {
                                                        conversationId: conversationId,
                                                        ownerName: displayName,
                                                        propertyTitle: title
                                                    }
                                                });
                                            } catch (error) {
                                                console.error('❌ Error starting conversation:', error);
                                                showAlert('Error', 'Failed to start conversation. Please try again.');
                                            }
                                        }}
                                    >
                                        <Text style={styles.buttonText}>Message Owner</Text>
                                    </TouchableOpacity>
                                );
                            })()}
                            <TouchableOpacity 
                                style={styles.viewButton}
                                onPress={(e) => {
                                    e.stopPropagation(); // Prevent card click
                                    handleViewDetails();
                                }}
                            >
                                <Text style={styles.buttonText}>View Details</Text>
                            </TouchableOpacity>
                        </HStack>
                    </HStack>
                </VStack>
            </Box>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardWrapper: {
        width: '100%',
        marginBottom: 16,
    },
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        overflow: 'hidden',
    },
    imageContainer: {
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: 192,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 28,
    },
    messageButton: {
        backgroundColor: '#16A34A',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    viewButton: {
        backgroundColor: '#2563EB',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default memo(ListingCard);
