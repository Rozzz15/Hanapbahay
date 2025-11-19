import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Image, ActivityIndicator, TouchableOpacity, FlatList, Modal, Pressable, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { getBrgyListings } from '../../utils/brgy-dashboard';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord, BookingRecord } from '../../types';
import { MapPin, Home, Bed, Bath, Tag, Phone, Mail, Calendar, Shield, ChevronDown, ChevronUp, User, Users, X } from 'lucide-react-native';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';

interface OwnerGroup {
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  properties: PublishedListingRecord[];
}

export default function PropertiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<PublishedListingRecord[]>([]);
  const [ownerGroups, setOwnerGroups] = useState<OwnerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barangay, setBarangay] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<PublishedListingRecord | null>(null);
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

      // Group properties by owner
      const ownerMap = new Map<string, OwnerGroup>();
      
      rawListings.forEach(listing => {
        const ownerId = listing.userId;
        const ownerName = listing.ownerName || 'Unknown Owner';
        
        if (!ownerMap.has(ownerId)) {
          ownerMap.set(ownerId, {
            ownerId,
            ownerName,
            ownerEmail: listing.email,
            ownerPhone: listing.contactNumber,
            properties: []
          });
        }

        const group = ownerMap.get(ownerId)!;
        group.properties.push(listing);
      });

      // Convert map to array and sort by owner name
      const groupsArray = Array.from(ownerMap.values()).sort((a, b) => {
        return a.ownerName.localeCompare(b.ownerName);
      });

      setOwnerGroups(groupsArray);
      console.log(`✅ Successfully loaded ${rawListings.length} properties for ${barangayName}`);
    } catch (error) {
      console.error('❌ Error loading properties:', error);
      setListings([]);
      setOwnerGroups([]);
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

  const openPropertyModal = (listing: PublishedListingRecord) => {
    setSelectedProperty(listing);
  };

  const closePropertyModal = () => {
    setSelectedProperty(null);
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

  const renderOwnerGroup = ({ item: group }: { item: OwnerGroup }) => {
    return (
      <View
        style={{
          marginBottom: designTokens.spacing.md,
          marginHorizontal: designTokens.spacing.lg,
        }}
      >
        {/* Owner Category Header */}
        <View
          style={{
            paddingVertical: designTokens.spacing.xs,
            paddingHorizontal: designTokens.spacing.sm,
            backgroundColor: designTokens.colors.primary + '15',
            borderRadius: 6,
            marginBottom: designTokens.spacing.xs,
            borderLeftWidth: 3,
            borderLeftColor: designTokens.colors.primary,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              backgroundColor: designTokens.colors.primary + '30',
              padding: 3,
              borderRadius: 3,
              marginRight: designTokens.spacing.xs,
            }}>
              <User size={10} color={designTokens.colors.primary} />
            </View>
            <Text style={{
              fontSize: designTokens.typography.sm,
              fontWeight: '700',
              color: designTokens.colors.textPrimary,
              flex: 1,
            }} numberOfLines={1}>
              {group.ownerName}
            </Text>
            <View style={{
              backgroundColor: designTokens.colors.primary + '30',
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 10,
            }}>
              <Text style={{
                fontSize: designTokens.typography.xs,
                fontWeight: '700',
                color: designTokens.colors.primary,
              }}>
                {group.properties.length}
              </Text>
            </View>
          </View>
          {(group.ownerEmail || group.ownerPhone) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 20, marginTop: 2, gap: designTokens.spacing.sm }}>
              {group.ownerEmail && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Mail size={9} color={designTokens.colors.textSecondary} />
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                  }} numberOfLines={1}>
                    {group.ownerEmail}
                  </Text>
                </View>
              )}
              {group.ownerPhone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Phone size={9} color={designTokens.colors.textSecondary} />
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                  }}>
                    {group.ownerPhone}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Properties List - Always Visible */}
        <View>
          {group.properties.map((listing, index) => (
            <View key={listing.id} style={{ marginBottom: designTokens.spacing.xs }}>
              {renderProperty(listing)}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderProperty = (listing: PublishedListingRecord) => {
    const tenants = propertyBookings.get(listing.id) || [];
    
    return (
      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 8,
          marginBottom: designTokens.spacing.xs,
          borderWidth: 1,
          borderColor: designTokens.colors.borderLight,
          overflow: 'hidden',
        }}
      >
        {/* Property Header - Clickable */}
        <TouchableOpacity
          onPress={() => openPropertyModal(listing)}
          activeOpacity={0.7}
          style={{
            padding: designTokens.spacing.sm,
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: 'white',
          }}
        >
          {/* Property Image */}
          <View style={{
            width: 70,
            height: 70,
            borderRadius: 6,
            overflow: 'hidden',
            marginRight: designTokens.spacing.sm,
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
                <Home size={24} color={designTokens.colors.textMuted} />
              </View>
            )}
            {/* Status Badge Overlay */}
            <View style={{
              position: 'absolute',
              top: 2,
              right: 2,
              backgroundColor: getStatusColor(listing.availabilityStatus || 'available'),
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 3,
            }}>
              <Text style={{
                color: 'white',
                fontSize: 8,
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
              fontWeight: '700',
              color: designTokens.colors.textPrimary,
              marginBottom: 2,
            }} numberOfLines={1}>
              {listing.businessName || listing.propertyType || 'Property'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: designTokens.spacing.xs, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Bed size={11} color={designTokens.colors.textSecondary} />
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                  fontWeight: '500',
                }}>
                  {listing.rooms || 0}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Bath size={11} color={designTokens.colors.textSecondary} />
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                  fontWeight: '500',
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
                  fontSize: designTokens.typography.xs,
                  fontWeight: '600',
                  color: designTokens.colors.primary,
                }}>
                  {listing.rentalType}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <MapPin size={10} color={designTokens.colors.textSecondary} />
              <Text style={{
                marginLeft: 3,
                fontSize: designTokens.typography.xs,
                color: designTokens.colors.textSecondary,
                flex: 1,
              }} numberOfLines={1}>
                {listing.address || 'Address not specified'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
              <Text style={{
                fontSize: designTokens.typography.base,
                fontWeight: '700',
                color: designTokens.colors.primary,
              }}>
                {formatCurrency(listing.monthlyRent || 0)}/mo
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPropertyModal = () => {
    if (!selectedProperty) return null;
    
    const tenants = propertyBookings.get(selectedProperty.id) || [];
    
    return (
      <Modal
        visible={selectedProperty !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={closePropertyModal}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onPress={closePropertyModal}
          />
          <View
            style={{
              backgroundColor: designTokens.colors.white,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              height: Dimensions.get('window').height * 0.9,
              zIndex: 1,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={true}
              style={{ flex: 1 }}
              contentContainerStyle={{ 
                paddingBottom: designTokens.spacing['2xl'] * 3,
              }}
              nestedScrollEnabled={true}
              bounces={true}
              scrollEnabled={true}
              alwaysBounceVertical={true}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
            >
              {/* Modal Header */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: designTokens.spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: designTokens.colors.borderLight,
              }}>
                <Text style={{
                  fontSize: designTokens.typography.xl,
                  fontWeight: '700',
                  color: designTokens.colors.textPrimary,
                }}>
                  Property Details
                </Text>
                <TouchableOpacity
                  onPress={closePropertyModal}
                  style={{
                    padding: designTokens.spacing.xs,
                    borderRadius: designTokens.borderRadius.full,
                    backgroundColor: designTokens.colors.background,
                  }}
                >
                  <X size={20} color={designTokens.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Property Image */}
              <View style={{
                width: '100%',
                height: 200,
                backgroundColor: designTokens.colors.background,
              }}>
                {selectedProperty.coverPhoto ? (
                  <Image
                    source={{ uri: selectedProperty.coverPhoto }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Home size={48} color={designTokens.colors.textMuted} />
                  </View>
                )}
              </View>

              {/* Content */}
              <View style={{ padding: designTokens.spacing.lg }}>
                {/* Property Title */}
                <View style={{ marginBottom: designTokens.spacing.lg }}>
                  <Text style={{
                    fontSize: designTokens.typography.xl,
                    fontWeight: '700',
                    color: designTokens.colors.textPrimary,
                    marginBottom: designTokens.spacing.xs,
                  }}>
                    {selectedProperty.businessName || selectedProperty.propertyType || 'Property'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Bed size={14} color={designTokens.colors.textSecondary} />
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        color: designTokens.colors.textSecondary,
                      }}>
                        {selectedProperty.rooms || 0} beds
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Bath size={14} color={designTokens.colors.textSecondary} />
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        color: designTokens.colors.textSecondary,
                      }}>
                        {selectedProperty.bathrooms || 0} baths
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: getStatusColor(selectedProperty.availabilityStatus || 'available') + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        fontWeight: '600',
                        color: getStatusColor(selectedProperty.availabilityStatus || 'available'),
                        textTransform: 'uppercase',
                      }}>
                        {selectedProperty.availabilityStatus || 'available'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Property Details */}
                <View style={{ marginBottom: designTokens.spacing.lg }}>
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
                    backgroundColor: designTokens.colors.background,
                    borderRadius: 12,
                    padding: designTokens.spacing.md,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: designTokens.spacing.sm }}>
                      <Text style={{ fontSize: designTokens.typography.sm, color: designTokens.colors.textSecondary }}>
                        Property Type
                      </Text>
                      <Text style={{ fontSize: designTokens.typography.sm, fontWeight: '600', color: designTokens.colors.textPrimary }}>
                        {selectedProperty.propertyType}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: designTokens.spacing.sm }}>
                      <Text style={{ fontSize: designTokens.typography.sm, color: designTokens.colors.textSecondary }}>
                        Rental Type
                      </Text>
                      <Text style={{ fontSize: designTokens.typography.sm, fontWeight: '600', color: designTokens.colors.textPrimary }}>
                        {selectedProperty.rentalType}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: designTokens.spacing.xs }}>
                      <MapPin size={14} color={designTokens.colors.textSecondary} />
                      <Text style={{
                        marginLeft: designTokens.spacing.xs,
                        fontSize: designTokens.typography.sm,
                        color: designTokens.colors.textSecondary,
                        flex: 1,
                      }}>
                        {selectedProperty.address || 'Address not specified'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Pricing */}
                <View style={{ marginBottom: designTokens.spacing.lg }}>
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
                    backgroundColor: designTokens.colors.background,
                    borderRadius: 12,
                    padding: designTokens.spacing.md,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: designTokens.spacing.sm }}>
                      <Text style={{ fontSize: designTokens.typography.sm, color: designTokens.colors.textSecondary }}>
                        Monthly Rent
                      </Text>
                      <Text style={{ fontSize: designTokens.typography.lg, fontWeight: '700', color: designTokens.colors.primary }}>
                        {formatCurrency(selectedProperty.monthlyRent || 0)}
                      </Text>
                    </View>
                    {selectedProperty.securityDeposit > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: designTokens.typography.sm, color: designTokens.colors.textSecondary }}>
                          Security Deposit
                        </Text>
                        <Text style={{ fontSize: designTokens.typography.base, fontWeight: '600', color: designTokens.colors.success }}>
                          {formatCurrency(selectedProperty.securityDeposit)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Tenant Information */}
                <View style={{ marginBottom: designTokens.spacing.lg }}>
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: designTokens.spacing.sm,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Users size={14} color={designTokens.colors.primary} />
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        fontWeight: '600',
                        color: designTokens.colors.textSecondary,
                        textTransform: 'uppercase',
                        marginLeft: designTokens.spacing.xs,
                        letterSpacing: 0.5,
                      }}>
                        Tenants ({tenants.length})
                      </Text>
                    </View>
                  </View>
                  {tenants.length > 0 ? (
                    <View style={{ gap: designTokens.spacing.xs }}>
                      {tenants.map((booking, index) => (
                        <View
                          key={booking.id}
                          style={{
                            backgroundColor: designTokens.colors.background,
                            borderRadius: 8,
                            padding: designTokens.spacing.sm,
                            borderLeftWidth: 3,
                            borderLeftColor: getBookingStatusColor(booking.status),
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.xs }}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <User size={12} color={designTokens.colors.primary} />
                                <Text style={{
                                  fontSize: designTokens.typography.sm,
                                  fontWeight: '600',
                                  color: designTokens.colors.textPrimary,
                                  marginLeft: designTokens.spacing.xs,
                                }} numberOfLines={1}>
                                  {booking.tenantName}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm, flexWrap: 'wrap' }}>
                                {booking.tenantEmail && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Mail size={10} color={designTokens.colors.textSecondary} />
                                    <Text style={{
                                      fontSize: designTokens.typography.xs,
                                      color: designTokens.colors.textSecondary,
                                    }} numberOfLines={1}>
                                      {booking.tenantEmail}
                                    </Text>
                                  </View>
                                )}
                                {booking.tenantPhone && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Phone size={10} color={designTokens.colors.textSecondary} />
                                    <Text style={{
                                      fontSize: designTokens.typography.xs,
                                      color: designTokens.colors.textSecondary,
                                    }}>
                                      {booking.tenantPhone}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: designTokens.spacing.sm }}>
                                <Calendar size={10} color={designTokens.colors.textSecondary} />
                                <Text style={{
                                  fontSize: designTokens.typography.xs,
                                  color: designTokens.colors.textSecondary,
                                }}>
                                  {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                                </Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginLeft: designTokens.spacing.xs }}>
                              <View style={{
                                backgroundColor: getBookingStatusColor(booking.status) + '20',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}>
                                <Text style={{
                                  fontSize: designTokens.typography.xs,
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
                                  fontSize: designTokens.typography.xs,
                                  fontWeight: '600',
                                  color: getPaymentStatusColor(booking.paymentStatus),
                                  textTransform: 'uppercase',
                                }}>
                                  {booking.paymentStatus}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{
                      backgroundColor: designTokens.colors.background,
                      borderRadius: 8,
                      padding: designTokens.spacing.md,
                      alignItems: 'center',
                    }}>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                        fontStyle: 'italic',
                      }}>
                        No tenants currently assigned
                      </Text>
                    </View>
                  )}
                </View>

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
                    backgroundColor: designTokens.colors.background,
                    borderRadius: 12,
                    padding: designTokens.spacing.md,
                  }}>
                <Text style={{
                  fontSize: designTokens.typography.base,
                  fontWeight: '600',
                  color: designTokens.colors.textPrimary,
                  marginBottom: designTokens.spacing.xs,
                }}>
                  {selectedProperty.ownerName || 'Unknown Owner'}
                </Text>
                {selectedProperty.businessName && (
                  <Text style={{
                    fontSize: designTokens.typography.sm,
                    color: designTokens.colors.textSecondary,
                    marginBottom: designTokens.spacing.xs,
                  }}>
                    {selectedProperty.businessName}
                  </Text>
                )}
                {selectedProperty.contactNumber && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.xs }}>
                    <Phone size={14} color={designTokens.colors.textSecondary} />
                    <Text style={{
                      marginLeft: designTokens.spacing.xs,
                      fontSize: designTokens.typography.sm,
                      color: designTokens.colors.textPrimary,
                    }}>
                      {selectedProperty.contactNumber}
                    </Text>
                  </View>
                )}
                {selectedProperty.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.xs }}>
                    <Mail size={14} color={designTokens.colors.textSecondary} />
                    <Text style={{
                      marginLeft: designTokens.spacing.xs,
                      fontSize: designTokens.typography.sm,
                      color: designTokens.colors.textPrimary,
                      flex: 1,
                    }} numberOfLines={1}>
                      {selectedProperty.email}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: designTokens.spacing.xs }}>
                  <Calendar size={14} color={designTokens.colors.textSecondary} />
                  <Text style={{
                    marginLeft: designTokens.spacing.xs,
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textMuted,
                  }}>
                    Published: {formatDate(selectedProperty.publishedAt || '')}
                  </Text>
                </View>
              </View>
            </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
          data={ownerGroups}
          renderItem={renderOwnerGroup}
          keyExtractor={(item) => item.ownerId}
          contentContainerStyle={{ paddingVertical: designTokens.spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      {renderPropertyModal()}
    </View>
  );
}
