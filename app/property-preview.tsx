import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Bed, Bath, Square, Wifi, Car, Shield, Star } from 'lucide-react-native';
import { ThemedView } from '@/components/common';
import { ThemedText } from '@/components/common';
import { GradientButton } from '@/components/buttons';

export default function PropertyPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get data from navigation parameters or use defaults
  const [propertyData, setPropertyData] = useState({
    id: params.id as string || 'unknown',
    title: params.title as string || "Modern Property Listing",
    address: params.location as string || "Address not provided",
    price: parseInt(params.price as string) || 0,
    rooms: parseInt(params.rooms as string) || 1,
    size: parseInt(params.size as string) || 50,
    rating: parseFloat(params.rating as string) || 4.8,
    reviews: parseInt(params.reviews as string) || 12,
    amenities: params.amenities ? JSON.parse(params.amenities as string) : ['WiFi', 'Parking', 'Air Conditioning'],
    photos: (() => {
      const photosArray = params.photos ? JSON.parse(params.photos as string) : [
        params.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500'
      ];
      
      // Ensure cover photo is included in the photos array if it exists and is not already included
      const coverPhoto = params.coverPhoto as string;
      if (coverPhoto && !photosArray.includes(coverPhoto)) {
        photosArray.unshift(coverPhoto); // Add cover photo at the beginning
      }
      
      return photosArray;
    })(),
    description: params.description as string || "Property details not provided.",
    rules: params.rules ? JSON.parse(params.rules as string) : [],
    ownerName: params.ownerName as string || 'Property Owner',
    businessName: params.businessName as string || '',
    contactNumber: params.contactNumber as string || 'Contact not provided',
    email: params.email as string || 'Email not provided',
    ownerUserId: params.ownerUserId as string || '',
    monthlyRent: params.monthlyRent ? parseInt(params.monthlyRent as string) : 0,
    baseRent: params.baseRent ? parseInt(params.baseRent as string) : 0,
    securityDeposit: params.securityDeposit ? parseInt(params.securityDeposit as string) : 0,
    propertyType: params.propertyType as string || 'Property',
    rentalType: params.rentalType as string || 'Not specified',
    availabilityStatus: params.availabilityStatus as string || 'Available',
    leaseTerm: params.leaseTerm as string || 'Not specified',
    paymentMethods: params.paymentMethods ? JSON.parse(params.paymentMethods as string) : [],
    emergencyContact: params.emergencyContact as string || '',
    videos: params.videos ? JSON.parse(params.videos as string) : [],
    coverPhoto: params.coverPhoto as string || '',
    publishedAt: params.publishedAt as string || ''
  });

  // Load cover photo from database if available
  useEffect(() => {
    const loadCoverPhoto = async () => {
      if (!propertyData.id || propertyData.id === 'unknown') return;
      
      try {
        const { getPropertyCoverPhoto, getPropertyPhotos } = await import('../utils/property-photos');
        
        // Get cover photo from database
        const coverPhoto = await getPropertyCoverPhoto(propertyData.id);
        if (coverPhoto) {
          console.log('✅ Loaded cover photo from database:', coverPhoto.photoUri);
          setPropertyData(prev => ({
            ...prev,
            coverPhoto: coverPhoto.photoUri
          }));
        }
        
        // Get all photos from database
        const dbPhotos = await getPropertyPhotos(propertyData.id);
        if (dbPhotos.length > 0) {
          const photoUris = dbPhotos.map(photo => photo.photoUri);
          console.log(`📸 Loaded ${dbPhotos.length} photos from database`);
          setPropertyData(prev => ({
            ...prev,
            photos: photoUris
          }));
        }
      } catch (error) {
        console.log('⚠️ Could not load photos from database:', error);
      }
    };
    
    loadCoverPhoto();
  }, [propertyData.id]);

  // Check if this is an owner viewing their own listing
  const isOwnerView = params.isOwnerView === 'true';
  const ownerViewTitle = isOwnerView ? 'Your Property Preview' : 'Property Details';

  // Debug: Log property data to see what's being passed
  console.log('🔍 Property Preview Data:', {
    id: propertyData.id,
    coverPhoto: propertyData.coverPhoto,
    photos: propertyData.photos,
    title: propertyData.title,
    businessName: propertyData.businessName,
    propertyType: propertyData.propertyType,
    isOwnerView: isOwnerView
  });

  // Generate dynamic title showing business name or just property type and address
  const displayTitle = propertyData.businessName 
    ? `${propertyData.businessName}'s ${propertyData.propertyType} in ${(propertyData.address || '').split(',')[0] || 'Property'}`
    : `${propertyData.propertyType} in ${(propertyData.address || '').split(',')[0] || 'Property'}`;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color="#374151" />
          <Text className="ml-2 text-lg font-semibold text-gray-800">{ownerViewTitle}</Text>
        </TouchableOpacity>
        {isOwnerView && (
          <View className="bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-blue-600 text-sm font-medium">Owner View</Text>
          </View>
        )}
      </View>

      <ScrollView className="flex-1">
        {/* Hero Image */}
        <View className="relative h-64">
          <Image
            source={{ 
              uri: (() => {
                // Prioritize cover photo, then first photo, then fallback
                const imageUri = propertyData.coverPhoto || 
                                (propertyData.photos && propertyData.photos[0]) || 
                                'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500';
                console.log('🖼️ Hero image URI:', imageUri);
                console.log('📊 Cover photo available:', !!propertyData.coverPhoto);
                console.log('📊 Photos available:', propertyData.photos?.length || 0);
                return imageUri;
              })()
            }}
            className="w-full h-full"
            resizeMode="cover"
            onError={(error) => {
              console.log('❌ Hero image load error:', error.nativeEvent.error);
              console.log('📸 Attempted to load:', propertyData.coverPhoto || propertyData.photos[0]);
            }}
            onLoad={() => {
              console.log('✅ Hero image loaded successfully:', propertyData.coverPhoto || propertyData.photos[0]);
            }}
          />
          <View className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full">
            <Text className="text-green-600 font-semibold">Available</Text>
          </View>
          
          {/* Cover Photo Indicator */}
          {propertyData.coverPhoto && (
            <View className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-bold">⭐ Cover Photo</Text>
            </View>
          )}
          
          {/* Rating Badge */}
          <View className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
            <View className="flex-row items-center">
              <Star size={14} color="#F59E0B" />
              <Text className="ml-1 text-sm font-semibold text-gray-800">
                {propertyData.rating} <Text className="text-gray-500">({propertyData.reviews})</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Property Info */}
        <View className="p-4 bg-white">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-2xl font-bold text-gray-800 flex-1">{displayTitle}</Text>
            <Text className="text-2xl font-bold text-green-600">₱{propertyData.price.toLocaleString()}</Text>
          </View>
          
          <View className="flex-row items-center mb-4">
            <MapPin size={16} color="#6B7280" />
            <Text className="ml-1 text-gray-600">{propertyData.address}</Text>
          </View>


          {/* Description */}
          <Text className="text-gray-700 mb-4">{propertyData.description}</Text>

          {/* Amenities */}
          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Amenities</Text>
            <View className="flex-row flex-wrap">
              {propertyData.amenities.map((amenity, index) => (
                <View key={index} className="flex-row items-center bg-green-50 px-3 py-1 rounded-full mr-2 mb-2">
                  <Wifi size={14} color="#10B981" />
                  <Text className="ml-1 text-green-700 text-sm">{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Photo Gallery */}
          {propertyData.photos && propertyData.photos.length > 0 && (
            <View className="mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Property Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {propertyData.photos.map((photo, index) => (
                  <View key={index} className="mr-3">
                    <Image
                      source={{ uri: photo }}
                      className="w-32 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* House Rules */}
          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-2">House Rules</Text>
            <View className="space-y-1">
              {propertyData.rules.map((rule, index) => (
                <View key={index} className="flex-row items-center mb-1">
                  <Text className="text-gray-600">• {rule}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rental Details */}
          <View className="bg-blue-50 p-4 rounded-lg mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Rental Details</Text>
            <View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-700">Monthly Rent:</Text>
                <Text className="font-semibold text-green-600">₱{propertyData.monthlyRent?.toLocaleString() || propertyData.price.toLocaleString()}</Text>
              </View>
              {propertyData.baseRent && propertyData.baseRent > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-700">Base Rent:</Text>
                  <Text className="font-semibold text-blue-600">₱{propertyData.baseRent.toLocaleString()}</Text>
                </View>
              )}
              {propertyData.securityDeposit && propertyData.securityDeposit > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-700">Security Deposit:</Text>
                  <Text className="font-semibold text-blue-600">₱{propertyData.securityDeposit.toLocaleString()}</Text>
                </View>
              )}
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-700">Lease Term:</Text>
                <Text className="font-medium">{propertyData.leaseTerm}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-700">Availability:</Text>
                <Text className="font-medium text-green-600">{propertyData.availabilityStatus}</Text>
              </View>
              {propertyData.paymentMethods && propertyData.paymentMethods.length > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-700">Payment Methods:</Text>
                  <Text className="font-medium">{propertyData.paymentMethods.join(', ')}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Photo Gallery */}
          {propertyData.photos && propertyData.photos.length > 0 && (
            <View className="mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Property Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {propertyData.photos.map((photo, index) => (
                  <View key={index} className="mr-3">
                    <Image
                      source={{ uri: photo }}
                      className="w-32 h-24 rounded-lg"
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('❌ Gallery image load error:', error.nativeEvent.error);
                        console.log('📸 Failed to load gallery image:', photo);
                      }}
                      onLoad={() => {
                        console.log('✅ Gallery image loaded:', photo);
                      }}
                    />
                    {photo === propertyData.coverPhoto && (
                      <View className="absolute top-1 left-1 bg-yellow-500 px-2 py-1 rounded">
                        <Text className="text-white text-xs font-bold">⭐ Cover</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Contact Info */}
          <View className="bg-gray-50 p-4 rounded-lg">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Contact Information</Text>
            <View>
              <Text className="text-gray-700 mb-2">Owner: {propertyData.ownerName}</Text>
              {propertyData.businessName && (
                <Text className="text-gray-700 mb-2">Business: {propertyData.businessName}</Text>
              )}
              <Text className="text-gray-700 mb-2">Phone: {propertyData.contactNumber}</Text>
              <Text className="text-gray-700 mb-2">Email: {propertyData.email}</Text>
              {propertyData.emergencyContact && (
                <Text className="text-gray-700 mb-2">Emergency Contact: {propertyData.emergencyContact}</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="p-4 bg-white border-t border-gray-200">
        <View className="flex-row space-x-3">
          {propertyData.ownerUserId && (
            <TouchableOpacity
              onPress={() => router.push({ 
                pathname: '/chat-room', 
                params: { 
                  name: propertyData.title, 
                  otherUserId: propertyData.ownerUserId 
                } 
              })}
              className="flex-1 bg-green-600 py-3 rounded-lg"
            >
              <Text className="text-center text-white font-medium">Message Owner</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={() => {
              // Handle booking action
              alert('Booking functionality will be implemented soon!');
            }}
            className="flex-1 bg-blue-600 py-3 rounded-lg"
          >
            <Text className="text-center text-white font-medium">Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
