import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Image, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { getBrgyListings } from '../../utils/brgy-dashboard';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord, BookingRecord } from '../../types';
import { MapPin, Home, Bed, Bath, Tag, Phone, Mail, Calendar, Shield, ChevronDown, ChevronUp, User, Users } from 'lucide-react-native';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';

export default function PropertiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<PublishedListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barangay, setBarangay] = useState('');
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [propertyBookings, setPropertyBookings] = useState<Map<string, BookingRecord[]>>(new Map());

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

      // Get all bookings
      const allBookings = await db.list<BookingRecord>('bookings');
      
      // Create a map of propertyId -> bookings (only approved bookings)
      const bookingsMap = new Map<string, BookingRecord[]>();
      
      rawListings.forEach(listing => {
        const propertyBookings = allBookings.filter(
          booking => booking.propertyId === listing.id && booking.status === 'approved'
        );
        if (propertyBookings.length > 0) {
          bookingsMap.set(listing.id, propertyBookings);
        }
      });

      setPropertyBookings(bookingsMap);
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

  const toggleExpand = (propertyId: string) => {
    setExpandedProperty(expandedProperty === propertyId ? null : propertyId);
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981'; // Green
      case 'pending': return '#F59E0B'; // Amber
      case 'completed': return '#6366F1'; // Indigo
      case 'cancelled': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981'; // Green
      case 'partial': return '#F59E0B'; // Amber
      case 'pending': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const renderProperty = ({ item: listing }: { item: PublishedListingRecord }) => {
    const isExpanded = expandedProperty === listing.id;
    const tenants = propertyBookings.get(listing.id) || [];
    
    return (
      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          marginBottom: 8,
          marginHorizontal: designTokens.spacing.lg,
          borderWidth: 1,
          borderColor: designTokens.colors.borderLight,
          overflow: 'hidden',
        }}
      >
        <TouchableOpacity
          onPress={() => toggleExpand(listing.id)}
          activeOpacity={0.7}
          style={{
            padding: designTokens.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Property Image */}
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            overflow: 'hidden',
            marginRight: designTokens.spacing.md,
            backgroundColor: designTokens.colors.background,
          }}>
            {listing.coverPhoto ? (
              <Image
                source={{ uri: listing.coverPhoto }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: designTokens.colors.background,
              }}>
                <Home size={32} color={designTokens.colors.textMuted} />
              </View>
            )}
            {/* Status Badge Overlay */}
            <View style={{
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: getStatusColor(listing.availabilityStatus || 'available'),
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}>
              <Text style={{
                color: 'white',
                fontSize: 9,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}>
                {listing.availabilityStatus || 'available'}
              </Text>
            </View>
          </View>

          {/* Main Info */}
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: designTokens.typography.base,
              fontWeight: '600',
              color: designTokens.colors.textPrimary,
              marginBottom: 4,
            }} numberOfLines={1}>
              {listing.businessName || listing.propertyType || 'Property'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: designTokens.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Bed size={12} color={designTokens.colors.textSecondary} />
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                }}>
                  {listing.rooms || 0}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Bath size={12} color={designTokens.colors.textSecondary} />
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                }}>
                  {listing.bathrooms || 0}
                </Text>
              </View>
              <View style={{
                backgroundColor: designTokens.colors.primary + '15',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
                <Text style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: designTokens.colors.primary,
                }}>
                  {listing.rentalType}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MapPin size={12} color={designTokens.colors.textSecondary} />
              <Text style={{
                marginLeft: 4,
                fontSize: designTokens.typography.xs,
                color: designTokens.colors.textSecondary,
                flex: 1,
              }} numberOfLines={1}>
                {listing.address || 'Address not specified'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{
                fontSize: designTokens.typography.base,
                fontWeight: '700',
                color: designTokens.colors.primary,
              }}>
                {formatCurrency(listing.monthlyRent || 0)}/mo
              </Text>
              {tenants.length > 0 && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: designTokens.colors.success + '15',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  marginLeft: designTokens.spacing.xs,
                }}>
                  <Users size={10} color={designTokens.colors.success} />
                  <Text style={{
                    fontSize: 9,
                    fontWeight: '600',
                    color: designTokens.colors.success,
                    marginLeft: 4,
                  }}>
                    {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Expand Icon */}
          {isExpanded ? (
            <ChevronUp size={20} color={designTokens.colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={designTokens.colors.textSecondary} />
          )}
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={{
            borderTopWidth: 1,
            borderTopColor: designTokens.colors.borderLight,
            padding: designTokens.spacing.md,
            backgroundColor: designTokens.colors.background,
          }}>
            {/* Property Type & Details */}
            <View style={{ marginBottom: designTokens.spacing.md }}>
              <Text style={{
                fontSize: designTokens.typography.xs,
                fontWeight: '600',
                color: designTokens.colors.textSecondary,
                textTransform: 'uppercase',
                marginBottom: designTokens.spacing.sm,
                letterSpacing: 0.5,
              }}>
                Property Details
              </Text>
              <View style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: designTokens.spacing.sm,
                marginBottom: designTokens.spacing.xs,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary }}>
                    Property Type
                  </Text>
                  <Text style={{ fontSize: designTokens.typography.sm, fontWeight: '600', color: designTokens.colors.textPrimary }}>
                    {listing.propertyType}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary }}>
                    Rental Type
                  </Text>
                  <Text style={{ fontSize: designTokens.typography.sm, fontWeight: '600', color: designTokens.colors.textPrimary }}>
                    {listing.rentalType}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary }}>
                    Status
                  </Text>
                  <View style={{
                    backgroundColor: getStatusColor(listing.availabilityStatus || 'available') + '20',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      fontWeight: '600',
                      color: getStatusColor(listing.availabilityStatus || 'available'),
                      textTransform: 'uppercase',
                    }}>
                      {listing.availabilityStatus || 'available'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Pricing */}
            <View style={{ marginBottom: designTokens.spacing.md }}>
              <Text style={{
                fontSize: designTokens.typography.xs,
                fontWeight: '600',
                color: designTokens.colors.textSecondary,
                textTransform: 'uppercase',
                marginBottom: designTokens.spacing.sm,
                letterSpacing: 0.5,
              }}>
                Pricing
              </Text>
              <View style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: designTokens.spacing.sm,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary }}>
                    Monthly Rent
                  </Text>
                  <Text style={{ fontSize: designTokens.typography.sm, fontWeight: '700', color: designTokens.colors.primary }}>
                    {formatCurrency(listing.monthlyRent || 0)}
                  </Text>
                </View>
                {listing.securityDeposit > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary }}>
                      Security Deposit
                    </Text>
                    <Text style={{ fontSize: designTokens.typography.sm, fontWeight: '600', color: designTokens.colors.success }}>
                      {formatCurrency(listing.securityDeposit)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Tenant Information */}
            {tenants.length > 0 && (
              <View style={{ marginBottom: designTokens.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                  <Users size={14} color={designTokens.colors.primary} />
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    fontWeight: '600',
                    color: designTokens.colors.textSecondary,
                    textTransform: 'uppercase',
                    marginLeft: 6,
                    letterSpacing: 0.5,
                  }}>
                    Tenant Information ({tenants.length})
                  </Text>
                </View>
                {tenants.map((booking, index) => (
                  <View
                    key={booking.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 8,
                      padding: designTokens.spacing.sm,
                      marginBottom: index < tenants.length - 1 ? designTokens.spacing.xs : 0,
                      borderLeftWidth: 3,
                      borderLeftColor: getBookingStatusColor(booking.status),
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <User size={14} color={designTokens.colors.primary} />
                          <Text style={{
                            fontSize: designTokens.typography.sm,
                            fontWeight: '600',
                            color: designTokens.colors.textPrimary,
                            marginLeft: 6,
                          }}>
                            {booking.tenantName}
                          </Text>
                        </View>
                        {booking.tenantEmail && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Mail size={12} color={designTokens.colors.textSecondary} />
                            <Text style={{
                              marginLeft: 4,
                              fontSize: designTokens.typography.xs,
                              color: designTokens.colors.textPrimary,
                              flex: 1,
                            }} numberOfLines={1}>
                              {booking.tenantEmail}
                            </Text>
                          </View>
                        )}
                        {booking.tenantPhone && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Phone size={12} color={designTokens.colors.textSecondary} />
                            <Text style={{
                              marginLeft: 4,
                              fontSize: designTokens.typography.xs,
                              color: designTokens.colors.textPrimary,
                            }}>
                              {booking.tenantPhone}
                            </Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Calendar size={12} color={designTokens.colors.textSecondary} />
                          <Text style={{
                            marginLeft: 4,
                            fontSize: designTokens.typography.xs,
                            color: designTokens.colors.textSecondary,
                          }}>
                            {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: designTokens.spacing.xs, flexWrap: 'wrap' }}>
                      <View style={{
                        backgroundColor: getBookingStatusColor(booking.status) + '20',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}>
                        <Text style={{
                          fontSize: 9,
                          fontWeight: '600',
                          color: getBookingStatusColor(booking.status),
                          textTransform: 'uppercase',
                        }}>
                          {booking.status}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: getPaymentStatusColor(booking.paymentStatus) + '20',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}>
                        <Text style={{
                          fontSize: 9,
                          fontWeight: '600',
                          color: getPaymentStatusColor(booking.paymentStatus),
                          textTransform: 'uppercase',
                        }}>
                          {booking.paymentStatus}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Owner Information */}
            <View>
              <Text style={{
                fontSize: designTokens.typography.xs,
                fontWeight: '600',
                color: designTokens.colors.textSecondary,
                textTransform: 'uppercase',
                marginBottom: designTokens.spacing.sm,
                letterSpacing: 0.5,
              }}>
                Owner Information
              </Text>
              <View style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: designTokens.spacing.sm,
              }}>
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  fontWeight: '600',
                  color: designTokens.colors.textPrimary,
                  marginBottom: 4,
                }}>
                  {listing.ownerName || 'Unknown Owner'}
                </Text>
                {listing.businessName && (
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                    marginBottom: designTokens.spacing.xs,
                  }}>
                    {listing.businessName}
                  </Text>
                )}
                {listing.contactNumber && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Phone size={12} color={designTokens.colors.textSecondary} />
                    <Text style={{
                      marginLeft: 4,
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.textPrimary,
                    }}>
                      {listing.contactNumber}
                    </Text>
                  </View>
                )}
                {listing.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Mail size={12} color={designTokens.colors.textSecondary} />
                    <Text style={{
                      marginLeft: 4,
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.textPrimary,
                      flex: 1,
                    }} numberOfLines={1}>
                      {listing.email}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: designTokens.spacing.xs }}>
                  <Calendar size={12} color={designTokens.colors.textSecondary} />
                  <Text style={{
                    marginLeft: 4,
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textMuted,
                  }}>
                    Published: {formatDate(listing.publishedAt || '')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: designTokens.colors.background }}>
      {/* Compact Header */}
      <View style={{
        backgroundColor: 'white',
        paddingVertical: designTokens.spacing.lg,
        paddingHorizontal: designTokens.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: designTokens.colors.borderLight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        zIndex: 10,
        elevation: 5,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md }}>
            <View style={{
              backgroundColor: designTokens.colors.primary + '20',
              padding: designTokens.spacing.sm,
              borderRadius: 8,
            }}>
              <Home size={20} color={designTokens.colors.primary} />
            </View>
            <View>
              <Text style={{
                fontSize: designTokens.typography.lg,
                fontWeight: '700',
                color: designTokens.colors.textPrimary,
              }}>
                Properties Management
              </Text>
              <Text style={{
                fontSize: designTokens.typography.xs,
                color: designTokens.colors.textSecondary,
                marginTop: 2,
              }}>
                {barangay} • {listings.length} {listings.length === 1 ? 'property' : 'properties'}
              </Text>
            </View>
          </View>
          <View style={{
            backgroundColor: designTokens.colors.primary,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: designTokens.typography.base }}>
              {listings.length}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={designTokens.colors.primary} />
          <Text style={{ marginTop: designTokens.spacing.md, color: designTokens.colors.textSecondary, fontSize: designTokens.typography.sm }}>
            Loading properties...
          </Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: designTokens.spacing['2xl'] }}>
          <View style={{
            backgroundColor: designTokens.colors.background,
            borderRadius: 50,
            width: 80,
            height: 80,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: designTokens.spacing.lg,
          }}>
            <Home size={40} color={designTokens.colors.textMuted} />
          </View>
          <Text style={{
            color: designTokens.colors.textPrimary,
            fontSize: designTokens.typography.lg,
            fontWeight: '600',
            marginBottom: designTokens.spacing.sm,
          }}>
            No properties found
          </Text>
          <Text style={{
            color: designTokens.colors.textSecondary,
            fontSize: designTokens.typography.sm,
            textAlign: 'center',
            maxWidth: 280,
          }}>
            No published listings in {barangay} yet. New properties will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderProperty}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: designTokens.spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
