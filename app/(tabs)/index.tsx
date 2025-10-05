import { ScrollView, View, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { db, removeDuplicateListings } from '../../utils/db';
import { OwnerProfileRecord, DbUserRecord, ListingDraftRecord, PublishedListingRecord } from '../../types';

import { ThemedText } from '../../components/common';
import { Text } from 'react-native';
import { SafeAreaView } from "react-native";
import { ListingList, ListingCarousel } from '../../components/listings';
import ListingCard from '../../components/listings/ListingCard';
import { VStack } from '../../components/ui/vstack';
import { LocationSearchBar } from '../../components/forms';

// Removed default hardcoded listings; tenant UI now sources from owner listing data only.

export default function DashboardScreen() {
  const router = useRouter();
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const [searchText, setSearchText] = useState('');
  const [filteredListings, setFilteredListings] = useState<Array<{ image: string; title: string; location: string; rating: number; reviews: number; rooms: number; size: number; price: number }>>([]);
  const [owners, setOwners] = useState<Array<OwnerProfileRecord & { user?: DbUserRecord }>>([]);
  const [ownerListings, setOwnerListings] = useState<Array<{ image: string; title: string; location: string; rating: number; reviews: number; rooms: number; size: number; price: number }>>([]);

  useEffect(() => {
    const animateIndicator = () => {
      Animated.sequence([
        Animated.timing(scrollIndicatorOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scrollIndicatorOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => animateIndicator());
    };
    animateIndicator();
  }, [scrollIndicatorOpacity]);

  // Load featured owners from local DB
  useEffect(() => {
    const loadOwners = async () => {
      try {
        const ownerProfiles = await db.list<OwnerProfileRecord>('owner_profiles');
        const users = await db.list<DbUserRecord>('users');
        const userMap = new Map(users.map(u => [u.id, u] as const));
        const combined = ownerProfiles
          .map(op => ({ ...op, user: userMap.get(op.userId) }))
          .slice(-10) // latest up to 10
          .reverse();
        setOwners(combined);
      } catch (e) {
        // Fail silently to avoid breaking dashboard
        console.log('Failed to load owners', e);
      }
    };
    loadOwners();
  }, []);

  // Load published listings from local DB and map to ListingCard props
  useEffect(() => {
    const loadPublishedListings = async () => {
      try {
        // First, clean up any duplicate listings in the database
        await removeDuplicateListings();
        
        const publishedListings = await db.list<PublishedListingRecord>('published_listings');
        
        // Remove duplicates based on unique properties (address + propertyType + userId)
        const uniqueListings = publishedListings.reduce((acc, current) => {
          const key = `${current.address}_${current.propertyType}_${current.userId}`;
          if (!acc.has(key)) {
            acc.set(key, current);
          }
          return acc;
        }, new Map());
        
        const deduplicatedListings = Array.from(uniqueListings.values());
        
        // Load cover photos from database for each listing
        const mapped = await Promise.all(
          deduplicatedListings
            .slice(-20) // Get latest 20
            .reverse() // Most recent first
            .map(async (p) => {
              // Load cover photo from database
              let coverPhotoUri = p.coverPhoto;
              let allPhotos = p.photos || [];
              
              try {
                const { getPropertyCoverPhoto, getPropertyPhotos } = await import('../../utils/property-photos');
                
                // Get cover photo from database
                const coverPhoto = await getPropertyCoverPhoto(p.id);
                if (coverPhoto) {
                  coverPhotoUri = coverPhoto.photoUri;
                  console.log(`✅ Found cover photo for listing ${p.id}:`, coverPhotoUri);
                }
                
                // Get all photos from database
                const dbPhotos = await getPropertyPhotos(p.id);
                if (dbPhotos.length > 0) {
                  allPhotos = dbPhotos.map(photo => photo.photoUri);
                  console.log(`📸 Found ${dbPhotos.length} photos for listing ${p.id}`);
                }
              } catch (photoError) {
                console.log(`⚠️ Could not load photos for listing ${p.id}:`, photoError);
                // Fallback to stored photos
                coverPhotoUri = p.coverPhoto;
                allPhotos = p.photos || [];
              }
              
              // Debug: Log each listing's photo data
              console.log(`📸 Listing ${p.id} photos:`, {
                coverPhoto: coverPhotoUri,
                photos: allPhotos,
                photosCount: allPhotos.length,
                hasCoverPhoto: !!coverPhotoUri
              });
              
              return {
                id: p.id,
                image: coverPhotoUri || (allPhotos && allPhotos[0]) || `https://picsum.photos/seed/${p.id}/600/400`,
                title: p.businessName ? `${p.businessName}'s ${p.propertyType} in ${(p.address || '').split(',')[0] || 'Property'}` : `${p.propertyType} in ${(p.address || '').split(',')[0] || 'Property'}`,
                location: p.address || 'Philippines',
                rating: 4.8,
                reviews: 12,
                rooms: p.bedrooms || 1, // Use actual bedrooms from property data
                size: p.size || 50, // Use actual size from property data
                price: p.monthlyRent,
                ownerUserId: p.userId,
                description: p.description || `Beautiful ${p.propertyType} located in ${p.address || 'a great location'}. Perfect for your next home.`,
                amenities: p.amenities || ['WiFi', 'Parking', 'Air Conditioning'],
                photos: allPhotos.length > 0 ? allPhotos : [`https://picsum.photos/seed/${p.id}/600/400`],
                // Add more property data
                propertyType: p.propertyType,
                rentalType: p.rentalType,
                availabilityStatus: p.availabilityStatus,
                leaseTerm: p.leaseTerm,
                baseRent: p.baseRent,
                securityDeposit: p.securityDeposit,
                paymentMethods: p.paymentMethods,
                ownerName: p.ownerName,
                businessName: p.businessName,
                contactNumber: p.contactNumber,
                email: p.email,
                emergencyContact: p.emergencyContact,
                rules: p.rules,
                videos: p.videos,
                coverPhoto: coverPhotoUri,
                publishedAt: p.publishedAt
              };
            })
        );
        
        console.log(`📊 Loaded ${mapped.length} unique published listings (removed ${publishedListings.length - deduplicatedListings.length} duplicates)`);
        setOwnerListings(mapped);
      } catch (e) {
        console.log('Failed to load published listings', e);
      }
    };
    loadPublishedListings();
  }, []);

  // Featured listings derived from latest owner listings
  const featuredListings = ownerListings.slice(0, 5);


  const handleSearch = (text: string) => {
    setSearchText(text);
    console.log('Searching for:', text);
    
    // Filter owner listings based on search text
    const filtered = ownerListings.filter(listing => 
      listing.title.toLowerCase().includes(text.toLowerCase()) ||
      listing.location.toLowerCase().includes(text.toLowerCase())
    );
    
    setFilteredListings(filtered);
    console.log('Filtered results:', filtered.length, 'properties found');
    
    if (text.trim() === '') {
      console.log('Showing all owner listings');
    } else {
      console.log(`Found ${filtered.length} properties matching "${text}"`);
    }
  };

  const handleFilterPress = () => {
    router.push('/filter');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <VStack className="space-y-4 pt-6">
          {/* Enhanced Header Section with Gradient */}
          <View className="rounded-2xl shadow-lg overflow-hidden">
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="p-6"
            >
              <VStack className="space-y-3">
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>Find your place in</Text>
                <VStack className="flex-row items-center space-x-3">
                  <View className="bg-green-100 p-2 rounded-full">
                    <Ionicons name="location" size={28} color="#16a34a" />
                  </View>
                  <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#111827' }}>Lopez, Quezon</Text>
                  <Pressable 
                    className="bg-gray-100 p-2 rounded-full"
                    onPress={() => {
                      console.log('Location dropdown clicked');
                      // You can implement location selection functionality here
                    }}
                  >
                    <Ionicons name="chevron-down" size={24} color="#6b7280" />
                  </Pressable>
                </VStack>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  Discover amazing properties in your area
                </Text>
              </VStack>
            </LinearGradient>
          </View>
          <LocationSearchBar 
            onSearch={handleSearch} 
            onFilterPress={handleFilterPress}
          />
          
          {/* Featured Listings Section (owner data) */}
          <VStack className="space-y-3">
            <VStack className="flex-row items-center justify-between px-2">
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Featured Properties</Text>
              <Pressable 
                className="bg-green-100 px-4 py-2 rounded-full"
                onPress={() => {
                  console.log('View All Featured Properties clicked');
                  // You can implement navigation to a featured properties page here
                }}
              >
                <Text style={{ color: '#15803d', fontWeight: '600', fontSize: 14 }}>View All</Text>
              </Pressable>
            </VStack>
            <View className="relative">
              <ListingCarousel listings={featuredListings} />
              {/* Scroll indicators */}
              <View className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
              <Animated.View 
                style={{ 
                  opacity: scrollIndicatorOpacity,
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: [{ translateY: -20 }],
                  backgroundColor: '#dcfce7',
                  borderRadius: 20,
                  padding: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="chevron-forward" size={14} color="#16a34a" />
              </Animated.View>
            </View>
          </VStack>
          
          {/* Featured Owners Section removed to avoid placeholder/duplicate data */}

          {/* All Properties Section (owner data only) */}
          {(() => {
            const filteredOwnerListings = ownerListings.filter(l =>
              l.title.toLowerCase().includes(searchText.toLowerCase()) ||
              l.location.toLowerCase().includes(searchText.toLowerCase())
            );
            const list = searchText ? filteredOwnerListings : ownerListings;
            const totalCount = list.length;
            return (
              <VStack className="space-y-3">
                <VStack className="flex-row items-center justify-between px-2">
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>All Properties</Text>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>
                    {`${totalCount} properties`}
                  </Text>
                </VStack>
                <ListingList listings={list} />
              </VStack>
            );
          })()}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

