import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { getBrgyListings } from '../../utils/brgy-dashboard';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord } from '../../types';
import { MapPin, Home, Bed, Bath, Tag, Phone, Mail, Calendar, Shield } from 'lucide-react-native';

export default function PropertiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<PublishedListingRecord[]>([]);
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

      console.log(`🏘️ Loading properties for barangay: "${barangayName.trim()}"`);
      console.log(`📍 Trimmed barangay name: "${barangayName.trim().toUpperCase()}"`);

      // Get all barangay listings
      const rawListings = await getBrgyListings(barangayName);
      
      console.log(`📋 Found ${rawListings.length} listings in ${barangayName}`);

      setListings(rawListings);
      console.log(`✅ Successfully loaded ${rawListings.length} properties for ${barangayName}`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981'; // Green
      case 'occupied': return '#EF4444'; // Red
      case 'reserved': return '#F59E0B'; // Amber
      default: return '#6B7280'; // Gray
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    // Format as peso currency with proper formatting
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `₱${formatted}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Professional Header */}
      <View style={{
        backgroundColor: 'white',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }}>
        <Text style={{
          fontSize: 24,
          fontWeight: '700',
          color: '#111827',
          marginBottom: 4,
        }}>
          Properties Management
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#6B7280',
        }}>
          {barangay} • {listings.length} {listings.length === 1 ? 'property' : 'properties'}
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ padding: 20 }}>
          {loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ marginTop: 16, color: '#6B7280', fontSize: 14 }}>
                Loading properties...
              </Text>
            </View>
          ) : listings.length === 0 ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <Home size={48} color="#D1D5DB" />
              <Text style={{ 
                color: '#111827', 
                fontSize: 18, 
                fontWeight: '600', 
                marginTop: 16,
                marginBottom: 8 
              }}>
                No properties found
              </Text>
              <Text style={{ 
                color: '#6B7280', 
                fontSize: 14, 
                textAlign: 'center',
                maxWidth: 280
              }}>
                No published listings in {barangay} yet. New properties will appear here.
              </Text>
            </View>
          ) : (
            listings.map((listing, index) => (
              <View 
                key={listing.id} 
                style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  marginBottom: 16,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                {/* Property Header */}
                <View style={{ position: 'relative' }}>
                  {listing.coverPhoto ? (
                    <Image 
                      source={{ uri: listing.coverPhoto }} 
                      style={{ width: '100%', height: 180 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ 
                      width: '100%', 
                      height: 180, 
                      backgroundColor: '#F3F4F6',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Home size={40} color="#D1D5DB" />
                    </View>
                  )}
                  
                  {/* Status Badge */}
                  <View style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: getStatusColor(listing.availabilityStatus || 'available'),
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}>
                    <Text style={{
                      color: 'white',
                      fontSize: 11,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}>
                      {listing.availabilityStatus || 'available'}
                    </Text>
                  </View>
                </View>

                {/* Property Info */}
                <View style={{ padding: 20 }}>
                  {/* Title & Property Type */}
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: 8,
                  }}>
                    {listing.businessName || listing.propertyType}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginRight: 16,
                      marginBottom: 4,
                    }}>
                      <Bed size={16} color="#6B7280" />
                      <Text style={{ marginLeft: 6, fontSize: 14, color: '#6B7280' }}>
                        {listing.bedrooms || 0} Bed
                      </Text>
                    </View>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginRight: 16,
                      marginBottom: 4,
                    }}>
                      <Bath size={16} color="#6B7280" />
                      <Text style={{ marginLeft: 6, fontSize: 14, color: '#6B7280' }}>
                        {listing.bathrooms || 0} Bath
                      </Text>
                    </View>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}>
                      <Tag size={16} color="#6B7280" />
                      <Text style={{ marginLeft: 6, fontSize: 14, color: '#6B7280' }}>
                        {listing.rentalType}
                      </Text>
                    </View>
                  </View>

                  {/* Location */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    marginBottom: 16
                  }}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={{ 
                      marginLeft: 6, 
                      fontSize: 13, 
                      color: '#6B7280',
                      flex: 1,
                      flexWrap: 'wrap'
                    }}>
                      {listing.address || 'Address not specified'}
                    </Text>
                  </View>

                  {/* Price Section */}
                  <View style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, color: '#3B82F6', fontWeight: '700' }}>₱</Text>
                        <Text style={{ marginLeft: 6, fontSize: 13, color: '#6B7280', fontWeight: '600' }}>
                          Monthly Rent
                        </Text>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#3B82F6' }}>
                        {formatCurrency(listing.monthlyRent || 0)}
                      </Text>
                    </View>
                    
                    {listing.securityDeposit > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Shield size={16} color="#10B981" />
                          <Text style={{ marginLeft: 6, fontSize: 13, color: '#6B7280' }}>
                            Security Deposit
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#10B981' }}>
                          {formatCurrency(listing.securityDeposit)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Owner Information */}
                  <View style={{
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    paddingTop: 16,
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}>
                      Owner Details
                    </Text>
                    
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                        {listing.ownerName || 'Unknown Owner'}
                      </Text>
                      {listing.businessName && (
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                          {listing.businessName}
                        </Text>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {listing.contactNumber && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}>
                          <Phone size={14} color="#6B7280" />
                          <Text style={{ marginLeft: 6, fontSize: 13, color: '#6B7280' }}>
                            {listing.contactNumber}
                          </Text>
                        </View>
                      )}
                      {listing.email && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Mail size={14} color="#6B7280" />
                          <Text style={{ marginLeft: 6, fontSize: 13, color: '#6B7280' }}>
                            {listing.email}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Published Date */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Calendar size={12} color="#6B7280" />
                      <Text style={{ marginLeft: 6, fontSize: 11, color: '#9CA3AF' }}>
                        Published: {formatDate(listing.publishedAt || '')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
