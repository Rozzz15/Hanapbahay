import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles } from '../../styles/owner-dashboard-styles';
import { getBrgyListings } from '../../utils/brgy-dashboard';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord } from '../../types';
import { ListingList } from '../../components/listings';
import type { ListingType } from '../../components/listings/ListingCard';

export default function PropertiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ListingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barangay, setBarangay] = useState('');

  // Check authentication and load data
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('brgy_official')) {
      router.replace('/(tabs)');
      return;
    }

    loadProperties();
  }, [user?.id]);

  const loadProperties = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get barangay name from user data
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      const barangayName = userRecord?.barangay || 'Unknown Barangay';
      setBarangay(barangayName);

      console.log(`🏘️ Loading properties for ${barangayName}...`);

      // Get all barangay listings
      const rawListings = await getBrgyListings(barangayName);
      
      console.log(`📋 Found ${rawListings.length} listings in ${barangayName}`);

      // Map PublishedListingRecord to ListingType
      const mappedListings: ListingType[] = rawListings.map((listing: PublishedListingRecord) => {
        // Generate title
        const addressPart = listing.address?.split(',')[0] || 'Unknown Location';
        const title = listing.businessName 
          ? `${listing.businessName}'s ${listing.propertyType || 'Property'}`
          : `${listing.propertyType || 'Property'} in ${addressPart}`;

        return {
          id: listing.id,
          image: listing.coverPhoto || '',
          coverPhoto: listing.coverPhoto || '',
          title: title,
          location: listing.address || 'Location not specified',
          rating: 0, // Default rating - could fetch from ratings table
          reviews: 0, // Default reviews
          rooms: listing.bedrooms || 1,
          bedrooms: listing.bedrooms || 1,
          bathrooms: listing.bathrooms || 0,
          size: 0, // Not in PublishedListingRecord
          price: listing.monthlyRent || 0,
          ownerUserId: listing.userId,
          description: `${listing.propertyType} - ${listing.rentalType}`,
          amenities: listing.amenities || [],
          photos: listing.photos || [],
          propertyType: listing.propertyType,
          rentalType: listing.rentalType,
          availabilityStatus: listing.availabilityStatus,
          leaseTerm: listing.leaseTerm,
          securityDeposit: listing.securityDeposit,
          paymentMethods: listing.paymentMethods,
          ownerName: listing.ownerName,
          businessName: listing.businessName,
          contactNumber: listing.contactNumber,
          email: listing.email,
          emergencyContact: listing.emergencyContact,
          videos: listing.videos || [],
          publishedAt: listing.publishedAt
        };
      });

      setListings(mappedListings);
      console.log(`✅ Successfully loaded ${mappedListings.length} properties for ${barangayName}`);
    } catch (error) {
      console.error('❌ Error loading properties:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProperties();
    setRefreshing(false);
  };

  return (
    <View style={sharedStyles.container}>
      <ScrollView 
        style={sharedStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={sharedStyles.pageContainer}>
          <Text style={sharedStyles.pageTitle}>
            Properties in {barangay}
          </Text>
          <Text style={sharedStyles.pageSubtitle}>
            Browse available rental properties in your barangay
          </Text>

          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 16 }}>Loading properties...</Text>
            </View>
          ) : listings.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                No properties found
              </Text>
              <Text style={{ color: '#999', fontSize: 14, textAlign: 'center' }}>
                No published listings in {barangay} yet.
              </Text>
            </View>
          ) : (
            <ListingList 
              listings={listings}
              title=""
              subtitle={`${listings.length} ${listings.length === 1 ? 'property' : 'properties'} available in ${barangay}`}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
