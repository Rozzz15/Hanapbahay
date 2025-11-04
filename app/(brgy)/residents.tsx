import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles } from '../../styles/owner-dashboard-styles';
import { db } from '../../utils/db';
import { DbUserRecord, BookingRecord, PublishedListingRecord } from '../../types';
import { Mail, Phone, Calendar, MapPin, CreditCard, CheckCircle } from 'lucide-react-native';

interface ResidentInfo {
  userId: string;
  name: string;
  email: string;
  phone: string;
  bookingCount: number;
  bookings: BookingRecord[];
}

export default function ResidentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      // Create resident info list
      const residentsList: ResidentInfo[] = [];
      tenantMap.forEach((bookings, tenantId) => {
        const booking = bookings[0];
        if (booking) {
          residentsList.push({
            userId: booking.tenantId,
            name: booking.tenantName,
            email: booking.tenantEmail,
            phone: booking.tenantPhone,
            bookingCount: bookings.length,
            bookings
          });
        }
      });

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#111827',
              marginBottom: 4,
            }}>
              Residents
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
            }}>
              {residents.length} {residents.length === 1 ? 'resident' : 'residents'} • With completed payments
            </Text>
          </View>
          <View style={{
            backgroundColor: '#3B82F6',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
              {residents.length}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={{ padding: 20 }}>
          {loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ marginTop: 16, color: '#6B7280', fontSize: 14 }}>
                Loading residents...
              </Text>
            </View>
          ) : residents.length === 0 ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <View style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 50,
                width: 80,
                height: 80,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <Phone size={40} color="#9CA3AF" />
              </View>
              <Text style={{ 
                color: '#111827', 
                fontSize: 20, 
                fontWeight: '600', 
                marginBottom: 8 
              }}>
                No residents found
              </Text>
              <Text style={{ 
                color: '#6B7280', 
                fontSize: 14, 
                textAlign: 'center',
                maxWidth: 280
              }}>
                Residents will appear here once they have approved bookings for properties in your barangay.
              </Text>
            </View>
          ) : (
            residents.map((resident, index) => (
              <View
                key={resident.userId}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  marginBottom: 20,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 4,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                {/* Header Section */}
                <View style={{
                  backgroundColor: '#3B82F6',
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <View style={{ flex: 1 }}>
                    <View style={{
                      backgroundColor: 'white',
                      borderRadius: 50,
                      width: 56,
                      height: 56,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}>
                      <Text style={{
                        fontSize: 24,
                        fontWeight: '700',
                        color: '#3B82F6',
                      }}>
                        {resident.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: 'white',
                      marginBottom: 4,
                    }}>
                      {resident.name}
                    </Text>
                    <Text style={{
                      fontSize: 13,
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}>
                      {resident.bookingCount} {resident.bookingCount === 1 ? 'Active Booking' : 'Active Bookings'}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: 'white',
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                  }}>
                    <CheckCircle size={20} color="#10B981" />
                  </View>
                </View>

                {/* Contact Information */}
                <View style={{ padding: 20 }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    marginBottom: 16,
                    letterSpacing: 0.5,
                  }}>
                    Contact Information
                  </Text>

                  <View style={{ marginBottom: 16 }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                      backgroundColor: '#F9FAFB',
                      padding: 12,
                      borderRadius: 10,
                    }}>
                      <View style={{
                        backgroundColor: '#3B82F6',
                        padding: 8,
                        borderRadius: 8,
                        marginRight: 12,
                      }}>
                        <Mail size={16} color="white" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 11,
                          color: '#6B7280',
                          fontWeight: '500',
                          marginBottom: 2,
                          textTransform: 'uppercase',
                        }}>
                          Email
                        </Text>
                        <Text style={{
                          fontSize: 15,
                          color: '#111827',
                          fontWeight: '500',
                        }}>
                          {resident.email}
                        </Text>
                      </View>
                    </View>

                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F9FAFB',
                      padding: 12,
                      borderRadius: 10,
                    }}>
                      <View style={{
                        backgroundColor: '#10B981',
                        padding: 8,
                        borderRadius: 8,
                        marginRight: 12,
                      }}>
                        <Phone size={16} color="white" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 11,
                          color: '#6B7280',
                          fontWeight: '500',
                          marginBottom: 2,
                          textTransform: 'uppercase',
                        }}>
                          Phone
                        </Text>
                        <Text style={{
                          fontSize: 15,
                          color: '#111827',
                          fontWeight: '500',
                        }}>
                          {resident.phone}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Bookings Details */}
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    letterSpacing: 0.5,
                  }}>
                    Booking Details
                  </Text>

                  {resident.bookings.slice(0, 2).map((booking, idx) => (
                    <View
                      key={booking.id}
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: '#10B981',
                      }}
                    >
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#111827',
                        marginBottom: 8,
                      }}>
                        {booking.propertyTitle}
                      </Text>

                      <View style={{ marginBottom: 8 }}>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}>
                          <MapPin size={14} color="#6B7280" />
                          <Text style={{
                            marginLeft: 8,
                            fontSize: 13,
                            color: '#6B7280',
                          }}>
                            {booking.propertyAddress}
                          </Text>
                        </View>

                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}>
                          <Calendar size={14} color="#6B7280" />
                          <Text style={{
                            marginLeft: 8,
                            fontSize: 13,
                            color: '#6B7280',
                          }}>
                            {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                          </Text>
                        </View>

                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}>
                          <CreditCard size={14} color="#6B7280" />
                          <Text style={{
                            marginLeft: 8,
                            fontSize: 13,
                            color: '#6B7280',
                          }}>
                            {formatCurrency(booking.monthlyRent)}/month
                          </Text>
                        </View>
                      </View>

                      <View style={{
                        backgroundColor: '#10B981',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        alignSelf: 'flex-start',
                      }}>
                        <Text style={{
                          color: 'white',
                          fontSize: 12,
                          fontWeight: '600',
                        }}>
                          APPROVED
          </Text>
                      </View>
                    </View>
                  ))}

                  {resident.bookingCount > 2 && (
                    <Text style={{
                      fontSize: 13,
                      color: '#3B82F6',
                      fontWeight: '500',
                      textAlign: 'center',
                      marginTop: 8,
                    }}>
                      +{resident.bookingCount - 2} more {resident.bookingCount - 2 === 1 ? 'booking' : 'bookings'}
          </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
