import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../utils/db';
import { BookingRecord, PublishedListingRecord, DbUserRecord } from '../../types';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { 
  ArrowRight, 
  ArrowLeft, 
  Home, 
  User, 
  Calendar, 
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Filter
} from 'lucide-react-native';

interface MoveActivity {
  id: string;
  type: 'move-in' | 'move-out';
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  date: string;
  timestamp: string;
  bookingId: string;
}

export default function MoveMonitoring() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<MoveActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [barangay, setBarangay] = useState('');
  const [filter, setFilter] = useState<'all' | 'move-in' | 'move-out'>('all');
  const [stats, setStats] = useState({
    totalMoveIns: 0,
    totalMoveOuts: 0,
    pendingMoveIns: 0,
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get barangay from user
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      const userBarangay = userRecord?.barangay || '';
      setBarangay(userBarangay);

      // Get all bookings
      const allBookings = await db.list<BookingRecord>('bookings');
      const allListings = await db.list<PublishedListingRecord>('published_listings');
      const allUsers = await db.list<DbUserRecord>('users');

      // Filter bookings in this barangay
      const bookingsInBarangay = allBookings.filter(booking => {
        const property = allListings.find(l => l.id === booking.propertyId);
        if (!property) return false;
        
        // Check property's barangay field
        if (property.barangay) {
          return property.barangay.trim().toUpperCase() === userBarangay.trim().toUpperCase();
        }
        
        // Fallback: check via property user
        const propertyUser = allUsers.find(u => u.id === property.userId);
        const userBarangayField = propertyUser?.barangay;
        return userBarangayField && userBarangayField.trim().toUpperCase() === userBarangay.trim().toUpperCase();
      });

      // Build move activities
      const moveActivities: MoveActivity[] = [];

      for (const booking of bookingsInBarangay) {
        const property = allListings.find(l => l.id === booking.propertyId);
        if (!property) continue;

        // Move-in: Approved bookings with paid status
        if (booking.status === 'approved' && booking.paymentStatus === 'paid') {
          moveActivities.push({
            id: `move-in-${booking.id}`,
            type: 'move-in',
            tenantId: booking.tenantId,
            tenantName: booking.tenantName,
            tenantEmail: booking.tenantEmail,
            tenantPhone: booking.tenantPhone,
            propertyId: booking.propertyId,
            propertyTitle: booking.propertyTitle || property.propertyType || 'Property',
            propertyAddress: booking.propertyAddress || property.address || '',
            status: booking.status,
            date: booking.startDate,
            timestamp: booking.approvedAt || booking.createdAt,
            bookingId: booking.id,
          });
        }

        // Move-out: Completed or cancelled bookings
        if (booking.status === 'completed' || booking.status === 'cancelled') {
          moveActivities.push({
            id: `move-out-${booking.id}`,
            type: 'move-out',
            tenantId: booking.tenantId,
            tenantName: booking.tenantName,
            tenantEmail: booking.tenantEmail,
            tenantPhone: booking.tenantPhone,
            propertyId: booking.propertyId,
            propertyTitle: booking.propertyTitle || property.propertyType || 'Property',
            propertyAddress: booking.propertyAddress || property.address || '',
            status: booking.status,
            date: booking.endDate || booking.completedAt || booking.cancelledAt || booking.updatedAt,
            timestamp: booking.completedAt || booking.cancelledAt || booking.updatedAt,
            bookingId: booking.id,
          });
        }
      }

      // Sort by timestamp (most recent first)
      moveActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(moveActivities);

      // Calculate stats
      const moveIns = moveActivities.filter(a => a.type === 'move-in');
      const moveOuts = moveActivities.filter(a => a.type === 'move-out');
      const pendingMoveIns = bookingsInBarangay.filter(
        b => b.status === 'approved' && b.paymentStatus !== 'paid'
      ).length;

      setStats({
        totalMoveIns: moveIns.length,
        totalMoveOuts: moveOuts.length,
        pendingMoveIns,
      });

    } catch (error) {
      console.error('Error loading move monitoring data:', error);
      Alert.alert('Error', 'Failed to load move monitoring data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'completed':
        return '#3B82F6';
      case 'cancelled':
        return '#EF4444';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle size={16} color={getStatusColor(status)} />;
      case 'cancelled':
      case 'rejected':
        return <XCircle size={16} color={getStatusColor(status)} />;
      default:
        return <Clock size={16} color={getStatusColor(status)} />;
    }
  };

  const renderActivity = (activity: MoveActivity, index: number) => {
    const dateTime = formatDateTime(activity.timestamp);
    const statusColor = getStatusColor(activity.status);
    const StatusIcon = getStatusIcon(activity.status);

    return (
      <View key={activity.id} style={[sharedStyles.card, { marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Icon */}
          <View style={[
            styles.activityIcon,
            activity.type === 'move-in' ? iconBackgrounds.green : iconBackgrounds.red
          ]}>
            {activity.type === 'move-in' ? (
              <ArrowRight size={20} color="#10B981" />
            ) : (
              <ArrowLeft size={20} color="#EF4444" />
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[sharedStyles.statLabel, { marginBottom: 4 }]}>
                  {activity.type === 'move-in' ? 'Incoming Tenant' : 'Outgoing Tenant'}
                </Text>
                <Text style={[sharedStyles.statValue, { fontSize: 16, marginBottom: 4 }]}>
                  {activity.tenantName}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  {StatusIcon}
                  <Text style={[sharedStyles.statSubtitle, { color: statusColor, fontSize: 12, textTransform: 'capitalize' }]}>
                    {activity.status}
                  </Text>
                </View>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                  {dateTime.date}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                  {dateTime.time}
                </Text>
              </View>
            </View>

            {/* Property Info */}
            <View style={[styles.infoRow, { marginBottom: 8 }]}>
              <Home size={14} color="#6B7280" />
              <Text style={[sharedStyles.statSubtitle, { fontSize: 13, flex: 1, marginLeft: 8 }]}>
                {activity.propertyTitle}
              </Text>
            </View>
            <View style={[styles.infoRow, { marginBottom: 8 }]}>
              <MapPin size={14} color="#6B7280" />
              <Text style={[sharedStyles.statSubtitle, { fontSize: 13, flex: 1, marginLeft: 8 }]}>
                {activity.propertyAddress}
              </Text>
            </View>

            {/* Contact Info */}
            <View style={styles.contactRow}>
              <View style={styles.contactItem}>
                <User size={12} color="#6B7280" />
                <Text style={[sharedStyles.statSubtitle, { fontSize: 11, marginLeft: 4 }]}>
                  {activity.tenantEmail}
                </Text>
              </View>
              {activity.tenantPhone && (
                <View style={styles.contactItem}>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                    {activity.tenantPhone}
                  </Text>
                </View>
              )}
            </View>

            {/* Date/Time Log */}
            <View style={[styles.dateLog, { marginTop: 12 }]}>
              <Calendar size={12} color="#6B7280" />
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11, marginLeft: 6 }]}>
                {activity.type === 'move-in' ? 'Move-in Date' : 'Move-out Date'}: {formatDateTime(activity.date).date}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading move monitoring data...</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={sharedStyles.pageHeader}>
            <TouchableOpacity 
              style={sharedStyles.backButton}
              onPress={() => router.back()}
            >
              <Text style={sharedStyles.primaryButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={sharedStyles.headerLeft}>
              <Text style={sharedStyles.pageTitle}>Move-in / Move-out Monitoring</Text>
              <Text style={sharedStyles.pageSubtitle}>
                BRGY {barangay.toUpperCase()}, LOPEZ, QUEZON
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={sharedStyles.section}>
            <Text style={sharedStyles.sectionTitle}>Overview</Text>
            <View style={sharedStyles.grid}>
              <View style={sharedStyles.gridItem}>
                <View style={sharedStyles.statCard}>
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
                      <ArrowRight size={20} color="#10B981" />
                    </View>
                  </View>
                  <Text style={sharedStyles.statLabel}>Total Move-ins</Text>
                  <Text style={sharedStyles.statValue}>{stats.totalMoveIns}</Text>
                  <Text style={sharedStyles.statSubtitle}>Incoming tenants</Text>
                </View>
              </View>

              <View style={sharedStyles.gridItem}>
                <View style={sharedStyles.statCard}>
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.red]}>
                      <ArrowLeft size={20} color="#EF4444" />
                    </View>
                  </View>
                  <Text style={sharedStyles.statLabel}>Total Move-outs</Text>
                  <Text style={sharedStyles.statValue}>{stats.totalMoveOuts}</Text>
                  <Text style={sharedStyles.statSubtitle}>Outgoing tenants</Text>
                </View>
              </View>

              <View style={sharedStyles.gridItem}>
                <View style={sharedStyles.statCard}>
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
                      <Clock size={20} color="#F59E0B" />
                    </View>
                  </View>
                  <Text style={sharedStyles.statLabel}>Pending Move-ins</Text>
                  <Text style={sharedStyles.statValue}>{stats.pendingMoveIns}</Text>
                  <Text style={sharedStyles.statSubtitle}>Awaiting payment</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={sharedStyles.section}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === 'all' && styles.filterButtonActive
                ]}
                onPress={() => setFilter('all')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filter === 'all' && styles.filterButtonTextActive
                ]}>
                  All Activities
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === 'move-in' && styles.filterButtonActive
                ]}
                onPress={() => setFilter('move-in')}
              >
                <ArrowRight size={16} color={filter === 'move-in' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[
                  styles.filterButtonText,
                  filter === 'move-in' && styles.filterButtonTextActive
                ]}>
                  Move-ins
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === 'move-out' && styles.filterButtonActive
                ]}
                onPress={() => setFilter('move-out')}
              >
                <ArrowLeft size={16} color={filter === 'move-out' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[
                  styles.filterButtonText,
                  filter === 'move-out' && styles.filterButtonTextActive
                ]}>
                  Move-outs
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Activities List */}
          {filteredActivities.length === 0 ? (
            <View style={sharedStyles.card}>
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Home size={48} color="#9CA3AF" />
                <Text style={[sharedStyles.sectionTitle, { marginTop: 16 }]}>
                  No Activities Found
                </Text>
                <Text style={sharedStyles.statSubtitle}>
                  {filter === 'all' 
                    ? 'No move-in or move-out activities in this barangay yet'
                    : filter === 'move-in'
                    ? 'No move-in activities found'
                    : 'No move-out activities found'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={sharedStyles.section}>
              <Text style={sharedStyles.sectionTitle}>
                {filter === 'all' 
                  ? `All Activities (${filteredActivities.length})`
                  : filter === 'move-in'
                  ? `Move-in Activities (${filteredActivities.length})`
                  : `Move-out Activities (${filteredActivities.length})`}
              </Text>
              {filteredActivities.map((activity, index) => renderActivity(activity, index))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLog: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
  },
  filterButtonActive: {
    backgroundColor: designTokens.colors.primary,
    borderColor: designTokens.colors.primary,
  },
  filterButtonText: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
    fontWeight: designTokens.typography.medium as any,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: designTokens.typography.semibold as any,
  },
});

