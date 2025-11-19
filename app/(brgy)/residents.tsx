import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, FlatList, Modal } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';
import { db } from '../../utils/db';
import { DbUserRecord, BookingRecord, PublishedListingRecord } from '../../types';
import { Mail, Phone, Calendar, MapPin, CreditCard, CheckCircle, ChevronDown, ChevronUp, Users, User, ArrowUpDown, Filter } from 'lucide-react-native';
import TenantInfoModal from '../../components/TenantInfoModal';
import { Image } from 'react-native';

interface ResidentInfo {
  userId: string;
  name: string;
  email: string;
  phone: string;
  bookingCount: number;
  bookings: BookingRecord[];
  profilePhoto?: string;
  primaryPropertyType?: string;
  primaryPropertyTitle?: string;
  earliestBookingDate?: string;
}

export default function ResidentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedResident, setExpandedResident] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<ResidentInfo | null>(null);
  const [tenantModalVisible, setTenantModalVisible] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'propertyType' | 'property'>('property');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    if (!user || !user.roles?.includes('brgy_official')) {
      router.replace('/login');
    } else {
      loadResidents();
    }
  }, [user]);

  const loadResidents = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get barangay name from user data
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      const barangay = userRecord?.barangay || 'Unknown Barangay';

      // Get all users
      const allUsers = await db.list<DbUserRecord>('users');

      // Get all published listings
      const allListings = await db.list<PublishedListingRecord>('published_listings');

      // Get approved bookings in this barangay
      const allBookings = await db.list<BookingRecord>('bookings');
      const approvedBookingsInBarangay = allBookings.filter(b => {
        const property = allListings.find(l => l.id === b.propertyId);
        if (!property) return false;

        // Check property's barangay field
        if (property.barangay) {
          return property.barangay.trim().toUpperCase() === barangay.trim().toUpperCase() && b.status === 'approved';
        }

        // Fallback: check via property user
        const propertyUser = allUsers.find(u => u.id === property.userId);
        const userBarangay = propertyUser?.barangay;
        return userBarangay && userBarangay.trim().toUpperCase() === barangay.trim().toUpperCase() && b.status === 'approved';
      });

      // Filter bookings to only include those with paid payment status
      // Only count tenants with completed payments as residents
      const paidBookingsInBarangay = approvedBookingsInBarangay.filter(b => b.paymentStatus === 'paid');

      // Get unique tenant IDs with their booking counts and bookings
      const tenantMap = new Map<string, BookingRecord[]>();
      paidBookingsInBarangay.forEach(booking => {
        const bookings = tenantMap.get(booking.tenantId) || [];
        bookings.push(booking);
        tenantMap.set(booking.tenantId, bookings);
      });

      // Create resident info list and load profile photos
      const residentsList: ResidentInfo[] = [];
      
      for (const [tenantId, bookings] of tenantMap.entries()) {
        const booking = bookings[0];
        if (booking) {
          // Load profile photo for this tenant
          let profilePhoto = '';
          try {
            const { loadUserProfilePhoto } = await import('../../utils/user-profile-photos');
            const photoUri = await loadUserProfilePhoto(tenantId);
            if (photoUri && photoUri.trim() && photoUri.length > 10) {
              profilePhoto = photoUri.trim();
            }
          } catch (error) {
            console.log('No profile photo found for tenant:', tenantId);
          }

          // Get property type from listing
          const property = allListings.find(l => l.id === booking.propertyId);
          const propertyType = property?.propertyType || 'Unknown';
          
          // Get earliest booking date
          const sortedBookings = [...bookings].sort((a, b) => 
            new Date(a.startDate || a.createdAt).getTime() - new Date(b.startDate || b.createdAt).getTime()
          );
          const earliestDate = sortedBookings[0]?.startDate || sortedBookings[0]?.createdAt || '';

          residentsList.push({
            userId: booking.tenantId,
            name: booking.tenantName,
            email: booking.tenantEmail,
            phone: booking.tenantPhone,
            bookingCount: bookings.length,
            bookings,
            profilePhoto,
            primaryPropertyType: propertyType,
            primaryPropertyTitle: booking.propertyTitle,
            earliestBookingDate: earliestDate
          });
        }
      }

      setResidents(residentsList);
    } catch (error) {
      console.error('Error loading residents:', error);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadResidents();
    setRefreshing(false);
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
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `₱${formatted}`;
  };

  const toggleExpand = (userId: string) => {
    setExpandedResident(expandedResident === userId ? null : userId);
  };

  const openTenantModal = (resident: ResidentInfo) => {
    setSelectedTenant(resident);
    setTenantModalVisible(true);
  };

  const closeTenantModal = () => {
    setTenantModalVisible(false);
    setSelectedTenant(null);
  };

  const getSortedResidents = () => {
    const sorted = [...residents];
    
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'date':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.earliestBookingDate || '').getTime();
          const dateB = new Date(b.earliestBookingDate || '').getTime();
          return dateB - dateA; // Newest first
        });
      
      case 'propertyType':
        return sorted.sort((a, b) => {
          const typeA = a.primaryPropertyType || 'Unknown';
          const typeB = b.primaryPropertyType || 'Unknown';
          if (typeA === typeB) {
            return a.name.localeCompare(b.name); // Secondary sort by name
          }
          return typeA.localeCompare(typeB);
        });
      
      case 'property':
        return sorted.sort((a, b) => {
          const propA = a.primaryPropertyTitle || 'Unknown';
          const propB = b.primaryPropertyTitle || 'Unknown';
          if (propA === propB) {
            return a.name.localeCompare(b.name); // Secondary sort by name
          }
          return propA.localeCompare(propB);
        });
      
      default:
        return sorted;
    }
  };

  const renderResident = ({ item: resident }: { item: ResidentInfo }) => {
    const isExpanded = expandedResident === resident.userId;
    
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
          onPress={() => toggleExpand(resident.userId)}
          activeOpacity={0.7}
          style={{
            padding: designTokens.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Avatar - Clickable to open profile */}
          <TouchableOpacity
            onPress={() => openTenantModal(resident)}
            activeOpacity={0.7}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: designTokens.colors.primary + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: designTokens.spacing.md,
              overflow: 'hidden',
            }}
          >
            {resident.profilePhoto && !imageErrors.has(resident.userId) ? (
              <Image
                source={{ uri: resident.profilePhoto }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                }}
                onError={() => {
                  // Mark this image as failed and fallback to initial
                  setImageErrors(prev => new Set(prev).add(resident.userId));
                }}
              />
            ) : (
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: designTokens.colors.primary,
              }}>
                {resident.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>

          {/* Main Info */}
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: designTokens.typography.base,
              fontWeight: '600',
              color: designTokens.colors.textPrimary,
              marginBottom: 2,
            }} numberOfLines={1}>
              {resident.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Mail size={12} color={designTokens.colors.textSecondary} />
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                }} numberOfLines={1}>
                  {resident.email}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: designTokens.spacing.md }}>
              <View style={{
                backgroundColor: designTokens.colors.successLight,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
                <Text style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: designTokens.colors.success,
                }}>
                  {resident.bookingCount} {resident.bookingCount === 1 ? 'booking' : 'bookings'}
                </Text>
              </View>
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
            {/* Contact Info */}
            <View style={{ marginBottom: designTokens.spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  fontWeight: '600',
                  color: designTokens.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Contact Information
                </Text>
                <TouchableOpacity
                  onPress={() => openTenantModal(resident)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: designTokens.spacing.sm,
                    paddingVertical: 4,
                    backgroundColor: designTokens.colors.primary + '15',
                    borderRadius: 6,
                  }}
                  activeOpacity={0.7}
                >
                  <User size={12} color={designTokens.colors.primary} />
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    fontWeight: '600',
                    color: designTokens.colors.primary,
                  }}>
                    View Profile
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: designTokens.spacing.xs,
                padding: designTokens.spacing.sm,
                backgroundColor: 'white',
                borderRadius: 8,
              }}>
                <Mail size={14} color={designTokens.colors.info} />
                <Text style={{
                  marginLeft: designTokens.spacing.sm,
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textPrimary,
                  flex: 1,
                }}>
                  {resident.email}
                </Text>
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: designTokens.spacing.sm,
                backgroundColor: 'white',
                borderRadius: 8,
              }}>
                <Phone size={14} color={designTokens.colors.success} />
                <Text style={{
                  marginLeft: designTokens.spacing.sm,
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textPrimary,
                  flex: 1,
                }}>
                  {resident.phone}
                </Text>
              </View>
            </View>

            {/* Bookings */}
            <View>
              <Text style={{
                fontSize: designTokens.typography.xs,
                fontWeight: '600',
                color: designTokens.colors.textSecondary,
                textTransform: 'uppercase',
                marginBottom: designTokens.spacing.sm,
                letterSpacing: 0.5,
              }}>
                Active Bookings ({resident.bookingCount})
              </Text>
              {resident.bookings.slice(0, 3).map((booking) => (
                <View
                  key={booking.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    padding: designTokens.spacing.sm,
                    marginBottom: designTokens.spacing.xs,
                    borderLeftWidth: 3,
                    borderLeftColor: designTokens.colors.success,
                  }}
                >
                  <Text style={{
                    fontSize: designTokens.typography.sm,
                    fontWeight: '600',
                    color: designTokens.colors.textPrimary,
                    marginBottom: 4,
                  }} numberOfLines={1}>
                    {booking.propertyTitle}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <MapPin size={12} color={designTokens.colors.textSecondary} />
                    <Text style={{
                      marginLeft: 4,
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.textSecondary,
                      flex: 1,
                    }} numberOfLines={1}>
                      {booking.propertyAddress}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Calendar size={12} color={designTokens.colors.textSecondary} />
                      <Text style={{
                        marginLeft: 4,
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                      }}>
                        {formatDate(booking.startDate)}
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      fontWeight: '600',
                      color: designTokens.colors.success,
                    }}>
                      {formatCurrency(booking.monthlyRent)}/mo
                    </Text>
                  </View>
                </View>
              ))}
              {resident.bookingCount > 3 && (
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.info,
                  textAlign: 'center',
                  marginTop: designTokens.spacing.xs,
                }}>
                  +{resident.bookingCount - 3} more {resident.bookingCount - 3 === 1 ? 'booking' : 'bookings'}
                </Text>
              )}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: designTokens.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md }}>
            <View style={{
              backgroundColor: designTokens.colors.primary + '20',
              padding: designTokens.spacing.sm,
              borderRadius: 8,
            }}>
              <Users size={20} color={designTokens.colors.primary} />
            </View>
            <View>
              <Text style={{
                fontSize: designTokens.typography.lg,
                fontWeight: '700',
                color: designTokens.colors.textPrimary,
              }}>
                Residents
              </Text>
              <Text style={{
                fontSize: designTokens.typography.xs,
                color: designTokens.colors.textSecondary,
                marginTop: 2,
              }}>
                {residents.length} {residents.length === 1 ? 'resident' : 'residents'} with completed payments
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
              {residents.length}
            </Text>
          </View>
        </View>

        {/* Sort Options */}
        <View style={{ position: 'relative', zIndex: 100 }}>
          <TouchableOpacity
            onPress={() => setShowSortMenu(!showSortMenu)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: designTokens.colors.background,
              padding: designTokens.spacing.sm,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
              <Filter size={16} color={designTokens.colors.textSecondary} />
              <Text style={{
                fontSize: designTokens.typography.sm,
                fontWeight: '600',
                color: designTokens.colors.textPrimary,
              }}>
                Sort: {
                  sortBy === 'name' ? 'Name (A-Z)' :
                  sortBy === 'date' ? 'Date (Newest)' :
                  sortBy === 'propertyType' ? 'Property Type' :
                  'By Property'
                }
              </Text>
            </View>
            <ArrowUpDown size={16} color={designTokens.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Menu Modal */}
      <Modal
        visible={showSortMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortMenu(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'flex-start',
            paddingTop: 120,
            paddingHorizontal: designTokens.spacing.lg,
          }}
          activeOpacity={1}
          onPress={() => setShowSortMenu(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View style={{
              padding: designTokens.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: designTokens.colors.borderLight,
            }}>
              <Text style={{
                fontSize: designTokens.typography.base,
                fontWeight: '700',
                color: designTokens.colors.textPrimary,
              }}>
                Sort Residents
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSortBy('name');
                setShowSortMenu(false);
              }}
              style={{
                padding: designTokens.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: designTokens.colors.borderLight,
                backgroundColor: sortBy === 'name' ? designTokens.colors.primary + '10' : 'transparent',
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: designTokens.typography.sm,
                fontWeight: sortBy === 'name' ? '600' : '400',
                color: sortBy === 'name' ? designTokens.colors.primary : designTokens.colors.textPrimary,
              }}>
                Name (A-Z)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSortBy('date');
                setShowSortMenu(false);
              }}
              style={{
                padding: designTokens.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: designTokens.colors.borderLight,
                backgroundColor: sortBy === 'date' ? designTokens.colors.primary + '10' : 'transparent',
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: designTokens.typography.sm,
                fontWeight: sortBy === 'date' ? '600' : '400',
                color: sortBy === 'date' ? designTokens.colors.primary : designTokens.colors.textPrimary,
              }}>
                Date (Newest First)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSortBy('propertyType');
                setShowSortMenu(false);
              }}
              style={{
                padding: designTokens.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: designTokens.colors.borderLight,
                backgroundColor: sortBy === 'propertyType' ? designTokens.colors.primary + '10' : 'transparent',
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: designTokens.typography.sm,
                fontWeight: sortBy === 'propertyType' ? '600' : '400',
                color: sortBy === 'propertyType' ? designTokens.colors.primary : designTokens.colors.textPrimary,
              }}>
                Property Type
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSortBy('property');
                setShowSortMenu(false);
              }}
              style={{
                padding: designTokens.spacing.md,
                backgroundColor: sortBy === 'property' ? designTokens.colors.primary + '10' : 'transparent',
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: designTokens.typography.sm,
                fontWeight: sortBy === 'property' ? '600' : '400',
                color: sortBy === 'property' ? designTokens.colors.primary : designTokens.colors.textPrimary,
              }}>
                Group by Property
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={designTokens.colors.primary} />
          <Text style={{ marginTop: designTokens.spacing.md, color: designTokens.colors.textSecondary, fontSize: designTokens.typography.sm }}>
            Loading residents...
          </Text>
        </View>
      ) : residents.length === 0 ? (
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
            <Users size={40} color={designTokens.colors.textMuted} />
          </View>
          <Text style={{
            color: designTokens.colors.textPrimary,
            fontSize: designTokens.typography.lg,
            fontWeight: '600',
            marginBottom: designTokens.spacing.sm,
          }}>
            No residents found
          </Text>
          <Text style={{
            color: designTokens.colors.textSecondary,
            fontSize: designTokens.typography.sm,
            textAlign: 'center',
            maxWidth: 280,
          }}>
            Residents will appear here once they have approved bookings for properties in your barangay.
          </Text>
        </View>
      ) : (
        <FlatList
          data={getSortedResidents()}
          renderItem={renderResident}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ paddingVertical: designTokens.spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Tenant Profile Modal */}
      {selectedTenant && (
        <TenantInfoModal
          visible={tenantModalVisible}
          tenantId={selectedTenant.userId}
          tenantName={selectedTenant.name}
          tenantEmail={selectedTenant.email}
          tenantPhone={selectedTenant.phone}
          tenantAvatar={selectedTenant.profilePhoto}
          onClose={closeTenantModal}
        />
      )}
    </View>
  );
}
