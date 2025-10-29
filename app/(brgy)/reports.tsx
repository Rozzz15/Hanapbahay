import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';
import { getComprehensiveAnalytics, ComprehensiveAnalytics, exportBarangayAnalytics } from '../../utils/brgy-analytics';
import { 
  Users, 
  TrendingUp, 
  Home, 
  Calendar, 
  DollarSign, 
  Eye, 
  MessageSquare,
  BarChart3,
  PieChart,
  Activity,
  UserCheck,
  Building2,
  Target,
  Award,
  TrendingDown,
  Clock,
  MapPin,
  Download,
  FileText,
  RefreshCw,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react-native';

// Helper component for progress bars
const ProgressBar = ({ percentage, color = '#3B82F6', height = 8 }: { percentage: number; color?: string; height?: number }) => (
  <View style={{
    height,
    backgroundColor: '#E5E7EB',
    borderRadius: height / 2,
    overflow: 'hidden',
  }}>
    <View style={{
      height: '100%',
      width: `${Math.min(100, Math.max(0, percentage))}%`,
      backgroundColor: color,
    }} />
  </View>
);

// Helper component for trend indicators
const TrendIndicator = ({ value, isPercentage = false }: { value: number; isPercentage?: boolean }) => {
  if (value === 0) return <Minus size={16} color="#6B7280" />;
  if (value > 0) return <ArrowUp size={16} color="#10B981" />;
  return <ArrowDown size={16} color="#EF4444" />;
};

// Helper component for status badges
const StatusBadge = ({ status, count }: { status: string; count: number }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      case 'cancelled': return '#6B7280';
      case 'completed': return '#10B981';
      case 'available': return '#10B981';
      case 'occupied': return '#3B82F6';
      case 'reserved': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: getStatusColor(status) + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
      marginBottom: 8,
    }}>
      <View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: getStatusColor(status),
        marginRight: 6,
      }} />
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        color: getStatusColor(status),
      }}>
        {status}: {count}
      </Text>
    </View>
  );
};

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    if (!user?.barangay) {
      console.log('❌ No barangay found in user object:', user);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📊 Loading analytics for barangay:', user.barangay);
      
      // Get the actual barangay name from the database (same as dashboard)
      const { db } = await import('../../utils/db');
      const userRecord = await db.get('users', user.id);
      const actualBarangay = userRecord?.barangay || user.barangay;
      
      console.log('📊 Using barangay name:', actualBarangay);
      console.log('📊 Trimmed barangay name:', actualBarangay.trim());
      console.log('📊 Uppercase barangay name:', actualBarangay.trim().toUpperCase());
      
      const data = await getComprehensiveAnalytics(actualBarangay);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!user?.barangay) return;

    try {
      setExporting(true);
      const exportData = await exportBarangayAnalytics(user.barangay);
      
      // Create downloadable files
      const summaryBlob = new Blob([exportData.summary], { type: 'text/plain' });
      const csvBlob = new Blob([exportData.csvData], { type: 'text/csv' });
      const jsonBlob = new Blob([JSON.stringify(exportData.jsonData, null, 2)], { type: 'application/json' });
      
      // Create download links
      const summaryUrl = URL.createObjectURL(summaryBlob);
      const csvUrl = URL.createObjectURL(csvBlob);
      const jsonUrl = URL.createObjectURL(jsonBlob);
      
      // Trigger downloads
      const summaryLink = document.createElement('a');
      summaryLink.href = summaryUrl;
      summaryLink.download = `${user.barangay}_analytics_report.txt`;
      summaryLink.click();
      
      const csvLink = document.createElement('a');
      csvLink.href = csvUrl;
      csvLink.download = `${user.barangay}_analytics_data.csv`;
      csvLink.click();
      
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `${user.barangay}_analytics_data.json`;
      jsonLink.click();
      
      // Clean up URLs
      setTimeout(() => {
        URL.revokeObjectURL(summaryUrl);
        URL.revokeObjectURL(csvUrl);
        URL.revokeObjectURL(jsonUrl);
      }, 1000);
      
      alert('Analytics data exported successfully! Check your downloads folder.');
      
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Failed to export analytics data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={sharedStyles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={sharedStyles.container}>
        <ScrollView style={sharedStyles.scrollView}>
          <View style={sharedStyles.pageContainer}>
            <View style={sharedStyles.pageHeader}>
              <View style={sharedStyles.headerLeft}>
                <Text style={sharedStyles.pageTitle}>Reports & Analytics</Text>
                <Text style={sharedStyles.pageSubtitle}>
                  Comprehensive data for {user?.barangay || 'your barangay'}
                </Text>
              </View>
            </View>

            <View style={[sharedStyles.card, { marginTop: designTokens.spacing.lg }]}>
              <Text style={[sharedStyles.sectionTitle, { fontSize: 20, marginBottom: 12 }]}>
                📊 No Data Available
              </Text>
              <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 16, lineHeight: 22 }}>
                Unable to load analytics data. Please try refreshing.
                </Text>
              </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={sharedStyles.pageHeader}>
            <View style={sharedStyles.headerLeft}>
              <Text style={sharedStyles.pageTitle}>📊 Reports & Analytics</Text>
              <Text style={sharedStyles.pageSubtitle}>
                Comprehensive data for {user?.barangay || 'your barangay'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={loadAnalytics}
                style={[sharedStyles.primaryButton, { paddingHorizontal: 12, paddingVertical: 8 }]}
                activeOpacity={0.8}
              >
                <RefreshCw size={16} color="white" />
                <Text style={[sharedStyles.primaryButtonText, { fontSize: 12, marginLeft: 4 }]}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 1. QUICK STATS OVERVIEW */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              📈 Quick Stats Overview
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {/* Total Properties */}
              <View style={[sharedStyles.card, { flex: 1, minWidth: 150 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#3B82F6' }]}>
                    <Home size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.statSubtitle, { marginLeft: 8 }]}>Properties</Text>
                </View>
                <Text style={[sharedStyles.statLabel, { fontSize: 24 }]}>
                  {analytics.totalProperties}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280' }]}>
                  Available: {analytics.availableProperties}
                </Text>
              </View>

              {/* Total Bookings */}
              <View style={[sharedStyles.card, { flex: 1, minWidth: 150 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#10B981' }]}>
                    <Calendar size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.statSubtitle, { marginLeft: 8 }]}>Bookings</Text>
                </View>
                <Text style={[sharedStyles.statLabel, { fontSize: 24 }]}>
                  {analytics.totalBookings}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280' }]}>
                  Approved: {analytics.approvedBookings}
                </Text>
              </View>

              {/* Total Revenue */}
              <View style={[sharedStyles.card, { flex: 1, minWidth: 150 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#F59E0B' }]}>
                    <DollarSign size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.statSubtitle, { marginLeft: 8 }]}>Revenue</Text>
                </View>
                <Text style={[sharedStyles.statLabel, { fontSize: 24 }]}>
                  ₱{analytics.totalRevenue.toLocaleString()}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280' }]}>
                  Avg: ₱{analytics.averageBookingValue.toLocaleString()}
                </Text>
              </View>

              {/* Total Views */}
              <View style={[sharedStyles.card, { flex: 1, minWidth: 150 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                    <Eye size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.statSubtitle, { marginLeft: 8 }]}>Views</Text>
                </View>
                <Text style={[sharedStyles.statLabel, { fontSize: 24 }]}>
                  {analytics.totalViews}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280' }]}>
                  Avg: {analytics.averageViewsPerProperty}/property
                </Text>
              </View>
            </View>
          </View>

          {/* 2. DEMOGRAPHICS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              👥 Demographics
            </Text>
            
            {/* Tenant Demographics */}
            {analytics.genderAnalytics.total > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#EC4899' }]}>
                    <Users size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                    Tenant Demographics
                  </Text>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={[sharedStyles.statLabel, { fontSize: 18, marginBottom: 8 }]}>
                    Total Tenants: {analytics.genderAnalytics.total}
                  </Text>
                </View>

                <View style={{ gap: 16 }}>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👨 Male</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics.genderAnalytics.male} ({analytics.genderAnalytics.malePercentage}%)
                      </Text>
                    </View>
                    <ProgressBar percentage={analytics.genderAnalytics.malePercentage} color="#3B82F6" height={12} />
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👩 Female</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics.genderAnalytics.female} ({analytics.genderAnalytics.femalePercentage}%)
                      </Text>
                    </View>
                    <ProgressBar percentage={analytics.genderAnalytics.femalePercentage} color="#EC4899" height={12} />
                  </View>

                  {analytics.genderAnalytics.unknown > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={sharedStyles.statLabel}>❓ Not Specified</Text>
                        <Text style={sharedStyles.statLabel}>{analytics.genderAnalytics.unknown}</Text>
                      </View>
                      <ProgressBar 
                        percentage={Math.round((analytics.genderAnalytics.unknown / analytics.genderAnalytics.total) * 100)} 
                        color="#9CA3AF" 
                        height={12} 
                      />
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Owner Demographics */}
            {analytics.ownerAnalytics.totalOwners > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#F59E0B' }]}>
                    <UserCheck size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                    Owner Demographics
                  </Text>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={[sharedStyles.statLabel, { fontSize: 18, marginBottom: 8 }]}>
                    Total Owners: {analytics.ownerAnalytics.totalOwners}
                  </Text>
                  <Text style={[sharedStyles.statLabel, { fontSize: 14, color: '#6B7280' }]}>
                    Avg Properties per Owner: {analytics.ownerAnalytics.averagePropertiesPerOwner}
                  </Text>
                </View>

                <View style={{ gap: 16 }}>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👨 Male Owners</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics.ownerAnalytics.maleOwners} ({analytics.ownerAnalytics.maleOwnerPercentage}%)
                      </Text>
                    </View>
                    <ProgressBar percentage={analytics.ownerAnalytics.maleOwnerPercentage} color="#3B82F6" height={12} />
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👩 Female Owners</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics.ownerAnalytics.femaleOwners} ({analytics.ownerAnalytics.femaleOwnerPercentage}%)
                      </Text>
                    </View>
                    <ProgressBar percentage={analytics.ownerAnalytics.femaleOwnerPercentage} color="#EC4899" height={12} />
                  </View>

                  {analytics.ownerAnalytics.unknownOwners > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={sharedStyles.statLabel}>❓ Not Specified</Text>
                        <Text style={sharedStyles.statLabel}>{analytics.ownerAnalytics.unknownOwners}</Text>
                      </View>
                      <ProgressBar 
                        percentage={Math.round((analytics.ownerAnalytics.unknownOwners / analytics.ownerAnalytics.totalOwners) * 100)} 
                        color="#9CA3AF" 
                        height={12} 
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* 3. PROPERTY ANALYTICS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              🏠 Property Analytics
            </Text>
            
            {/* Property Status */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#10B981' }]}>
                  <BarChart3 size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                  Property Status Breakdown
                </Text>
              </View>

              <View style={{ gap: 16 }}>
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={sharedStyles.statLabel}>🏠 Available</Text>
                    <Text style={sharedStyles.statLabel}>
                      {analytics.availableProperties} ({analytics.totalProperties > 0 ? Math.round((analytics.availableProperties / analytics.totalProperties) * 100) : 0}%)
                    </Text>
                  </View>
                  <ProgressBar 
                    percentage={analytics.totalProperties > 0 ? (analytics.availableProperties / analytics.totalProperties) * 100 : 0} 
                    color="#10B981" 
                    height={12} 
                  />
                </View>

                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={sharedStyles.statLabel}>👥 Occupied</Text>
                    <Text style={sharedStyles.statLabel}>
                      {analytics.occupiedProperties} ({analytics.totalProperties > 0 ? Math.round((analytics.occupiedProperties / analytics.totalProperties) * 100) : 0}%)
                    </Text>
                  </View>
                  <ProgressBar 
                    percentage={analytics.totalProperties > 0 ? (analytics.occupiedProperties / analytics.totalProperties) * 100 : 0} 
                    color="#3B82F6" 
                    height={12} 
                  />
                </View>

                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={sharedStyles.statLabel}>🔒 Reserved</Text>
                    <Text style={sharedStyles.statLabel}>
                      {analytics.reservedProperties} ({analytics.totalProperties > 0 ? Math.round((analytics.reservedProperties / analytics.totalProperties) * 100) : 0}%)
                    </Text>
                  </View>
                  <ProgressBar 
                    percentage={analytics.totalProperties > 0 ? (analytics.reservedProperties / analytics.totalProperties) * 100 : 0} 
                    color="#F59E0B" 
                    height={12} 
                  />
                </View>
              </View>
            </View>

            {/* Property Types */}
            {Object.keys(analytics.propertyTypes).length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                    <Home size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                    Property Types Distribution
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {Object.entries(analytics.propertyTypes).map(([type, count]) => (
                    <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={sharedStyles.statLabel}>{type}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[sharedStyles.statLabel, { color: '#3B82F6', marginRight: 8 }]}>{count}</Text>
                        <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280' }]}>
                          ({analytics.totalProperties > 0 ? Math.round((count / analytics.totalProperties) * 100) : 0}%)
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 4. BOOKING ANALYTICS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              📅 Booking Analytics
            </Text>
            
            {/* Booking Status */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <PieChart size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                  Booking Status Breakdown
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                <StatusBadge status="Approved" count={analytics.approvedBookings} />
                <StatusBadge status="Pending" count={analytics.pendingBookings} />
                <StatusBadge status="Rejected" count={analytics.rejectedBookings} />
                <StatusBadge status="Cancelled" count={analytics.cancelledBookings} />
                <StatusBadge status="Completed" count={analytics.completedBookings} />
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>✅ Approved</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>{analytics.approvedBookings}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>⏳ Pending</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>{analytics.pendingBookings}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>❌ Rejected</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#EF4444' }]}>{analytics.rejectedBookings}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>🚫 Cancelled</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#6B7280' }]}>{analytics.cancelledBookings}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>✅ Completed</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>{analytics.completedBookings}</Text>
                </View>
              </View>
            </View>

            {/* Booking Trends */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#10B981' }]}>
                  <TrendingUp size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                  Booking Trends
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>This Month</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[sharedStyles.statLabel, { color: '#10B981', marginRight: 8 }]}>
                      {analytics.bookingTrends.thisMonth}
                    </Text>
                    <TrendIndicator value={analytics.bookingTrends.thisMonth} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Last Month</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[sharedStyles.statLabel, { color: '#6B7280', marginRight: 8 }]}>
                      {analytics.bookingTrends.lastMonth}
                    </Text>
                    <TrendIndicator value={analytics.bookingTrends.lastMonth} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Growth Rate</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[
                      sharedStyles.statLabel, 
                      { 
                        color: analytics.bookingTrends.growthRate >= 0 ? '#10B981' : '#EF4444',
                        marginRight: 8 
                      }
                    ]}>
                      {analytics.bookingTrends.growthRate >= 0 ? '+' : ''}{analytics.bookingTrends.growthRate}%
                    </Text>
                    <TrendIndicator value={analytics.bookingTrends.growthRate} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 5. FINANCIAL SUMMARY */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              💰 Financial Summary
            </Text>
            
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#F59E0B' }]}>
                  <DollarSign size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                  Revenue & Pricing Analytics
                </Text>
              </View>

              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Total Revenue</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981', fontSize: 18 }]}>
                    ₱{analytics.totalRevenue.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Average Booking Value</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6' }]}>
                    ₱{analytics.averageBookingValue.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Average Monthly Rent</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#8B5CF6' }]}>
                    ₱{analytics.averageRent.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Conversion Rate</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>
                    {analytics.relationshipAnalytics.conversionRate}%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 6. ACTIVITY & ENGAGEMENT */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              📊 Activity & Engagement
            </Text>
            
            {/* Recent Activity */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#EF4444' }]}>
                  <Activity size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                  Recent Activity (Last 7 Days)
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Bookings</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    {analytics.recentActivity.newBookings}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Properties</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6' }]}>
                    {analytics.recentActivity.newProperties}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Owners</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>
                    {analytics.recentActivity.newOwners}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Tenants</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#EC4899' }]}>
                    {analytics.recentActivity.newTenants}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Inquiries</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#8B5CF6' }]}>
                    {analytics.recentActivity.newInquiries}
                  </Text>
                </View>
              </View>
            </View>

            {/* Engagement Metrics */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Eye size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                  Engagement Metrics
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Total Property Views</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#8B5CF6' }]}>
                    {analytics.totalViews}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Average Views per Property</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6' }]}>
                    {analytics.averageViewsPerProperty}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Total Inquiries</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    {analytics.totalInquiries}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 7. TOP PERFORMERS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              🏆 Top Performers
            </Text>
            
            {/* Top Performing Owners */}
            {analytics.ownerAnalytics.topOwners.length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#10B981' }]}>
                    <Award size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                    Top Performing Owners
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {analytics.ownerAnalytics.topOwners.map((owner, index) => (
                    <View key={owner.ownerId} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderBottomWidth: index < analytics.ownerAnalytics.topOwners.length - 1 ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statLabel, { fontSize: 16 }]}>
                          {index + 1}. {owner.ownerName}
                        </Text>
                        <Text style={[sharedStyles.statLabel, { fontSize: 14, color: '#6B7280' }]}>
                          {owner.propertyCount} properties
                        </Text>
                      </View>
                      <Text style={[sharedStyles.statLabel, { color: '#10B981', fontSize: 16 }]}>
                        ₱{owner.totalRevenue.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Most Active Owners */}
            {analytics.relationshipAnalytics.mostActiveOwners.length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#EF4444' }]}>
                    <TrendingUp size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                    Most Active Owners
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {analytics.relationshipAnalytics.mostActiveOwners.map((owner, index) => (
                    <View key={owner.ownerId} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderBottomWidth: index < analytics.relationshipAnalytics.mostActiveOwners.length - 1 ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statLabel, { fontSize: 16 }]}>
                          {index + 1}. {owner.ownerName}
                        </Text>
                        <Text style={[sharedStyles.statLabel, { fontSize: 14, color: '#6B7280' }]}>
                          {owner.bookingCount} bookings
                        </Text>
                      </View>
                      <Text style={[sharedStyles.statLabel, { color: '#10B981', fontSize: 16 }]}>
                        ₱{owner.revenue.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Most Active Tenants */}
            {analytics.relationshipAnalytics.mostActiveTenants.length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#EC4899' }]}>
                    <Users size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                    Most Active Tenants
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {analytics.relationshipAnalytics.mostActiveTenants.map((tenant, index) => (
                    <View key={tenant.tenantId} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderBottomWidth: index < analytics.relationshipAnalytics.mostActiveTenants.length - 1 ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statLabel, { fontSize: 16 }]}>
                          {index + 1}. {tenant.tenantName}
                        </Text>
                      </View>
                      <Text style={[sharedStyles.statLabel, { color: '#3B82F6', fontSize: 16 }]}>
                        {tenant.bookingCount} bookings
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 8. MARKET INSIGHTS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              📈 Market Insights
            </Text>
            
            {/* Market Analytics */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Building2 size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                  Market Analytics
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Occupancy Rate</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    {analytics.marketAnalytics.occupancyRate}%
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Avg Days on Market</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>
                    {analytics.marketAnalytics.averageDaysOnMarket} days
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Price Range</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6' }]}>
                    ₱{analytics.marketAnalytics.priceRange.min.toLocaleString()} - ₱{analytics.marketAnalytics.priceRange.max.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Median Price</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#8B5CF6' }]}>
                    ₱{analytics.marketAnalytics.priceRange.median.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Popular Property Types */}
            {analytics.marketAnalytics.popularPropertyTypes.length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#F59E0B' }]}>
                    <MapPin size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                    Popular Property Types
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {analytics.marketAnalytics.popularPropertyTypes.map((type, index) => (
                    <View key={type.type} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderBottomWidth: index < analytics.marketAnalytics.popularPropertyTypes.length - 1 ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statLabel, { fontSize: 16 }]}>
                          {type.type}
                        </Text>
                        <Text style={[sharedStyles.statLabel, { fontSize: 14, color: '#6B7280' }]}>
                          {type.count} properties
                        </Text>
                      </View>
                      <Text style={[sharedStyles.statLabel, { color: '#10B981', fontSize: 16 }]}>
                        ₱{type.averageRent.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tenant-Owner Relationships */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Target size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.md }]}>
                  Tenant-Owner Relationships
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Avg Bookings per Owner</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6' }]}>
                    {analytics.relationshipAnalytics.averageBookingsPerOwner}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Avg Bookings per Tenant</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    {analytics.relationshipAnalytics.averageBookingsPerTenant}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Conversion Rate</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>
                    {analytics.relationshipAnalytics.conversionRate}%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 12, 
            marginTop: designTokens.spacing.lg,
            marginBottom: designTokens.spacing.xl
          }}>
            <TouchableOpacity
              onPress={loadAnalytics}
              style={[sharedStyles.primaryButton, { flex: 1 }]}
              activeOpacity={0.8}
            >
              <RefreshCw size={20} color="white" />
              <Text style={[sharedStyles.primaryButtonText, { marginLeft: 8 }]}>
                🔄 Refresh Analytics
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleExport}
              disabled={exporting}
              style={[
                sharedStyles.primaryButton, 
                { 
                  flex: 1,
                  backgroundColor: exporting ? '#9CA3AF' : '#10B981',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }
              ]}
              activeOpacity={0.8}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Download size={20} color="white" />
              )}
              <Text style={sharedStyles.primaryButtonText}>
                {exporting ? 'Exporting...' : '📊 Export Data'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
