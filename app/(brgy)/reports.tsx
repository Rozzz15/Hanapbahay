import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';
import { getTenantGenderAnalytics } from '../../utils/brgy-analytics';
import { Users, TrendingUp } from 'lucide-react-native';

interface GenderAnalytics {
  total: number;
  male: number;
  female: number;
  unknown: number;
  malePercentage: number;
  femalePercentage: number;
}

interface DiagnosticInfo {
  hasApprovedBookings: boolean;
  hasBarangayListings: boolean;
  totalBookings: number;
  totalApprovedBookings: number;
  totalListingsInBarangay: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<GenderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    if (!user?.barangay) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getTenantGenderAnalytics(user.barangay);
      setAnalytics(data);
      
      // Get diagnostic info to help explain empty results
      const { db } = await import('../../utils/db');
      const allBookings = await db.list('bookings');
      const allListings = await db.list('published_listings');
      
      const approvedBookings = allBookings.filter(b => b.status === 'approved');
      const barangayListings = allListings.filter(l => l.barangay === user.barangay);
      
      setDiagnosticInfo({
        hasApprovedBookings: approvedBookings.length > 0,
        hasBarangayListings: barangayListings.length > 0,
        totalBookings: allBookings.length,
        totalApprovedBookings: approvedBookings.length,
        totalListingsInBarangay: barangayListings.length,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
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

  if (!analytics || analytics.total === 0) {
    return (
      <View style={sharedStyles.container}>
        <ScrollView style={sharedStyles.scrollView}>
          <View style={sharedStyles.pageContainer}>
            {/* Header */}
            <View style={sharedStyles.pageHeader}>
              <View style={sharedStyles.headerLeft}>
                <Text style={sharedStyles.pageTitle}>Reports & Analytics</Text>
                <Text style={sharedStyles.pageSubtitle}>
                  Tenant demographics for {user?.barangay || 'your barangay'}
                </Text>
              </View>
            </View>

            {/* Empty State */}
            <View style={[sharedStyles.card, { marginTop: designTokens.spacing.lg }]}>
              <Text style={[sharedStyles.sectionTitle, { fontSize: 20, marginBottom: 12 }]}>
                📊 No Analytics Data Available
              </Text>
              
              <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 16, lineHeight: 22 }}>
                The reports only count tenants with approved bookings (when property owners accept payments) in {user?.barangay}.
              </Text>

              {/* Diagnostic Information */}
              {diagnosticInfo && (
                <View style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 12,
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 12,
                  }}>
                    📋 Current Status:
                  </Text>
                  
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6B7280' }}>Total Bookings:</Text>
                      <Text style={{ fontWeight: '600', color: '#1F2937' }}>
                        {diagnosticInfo.totalBookings}
                      </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6B7280' }}>Approved Bookings:</Text>
                      <Text style={{
                        fontWeight: '600',
                        color: diagnosticInfo.hasApprovedBookings ? '#10B981' : '#EF4444'
                      }}>
                        {diagnosticInfo.totalApprovedBookings}
                      </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6B7280' }}>Listings in {user?.barangay}:</Text>
                      <Text style={{
                        fontWeight: '600',
                        color: diagnosticInfo.hasBarangayListings ? '#10B981' : '#EF4444'
                      }}>
                        {diagnosticInfo.totalListingsInBarangay}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Explanation */}
              <View style={{
                backgroundColor: '#EFF6FF',
                borderRadius: 12,
                padding: 16,
                marginTop: 16,
                borderLeftWidth: 4,
                borderLeftColor: '#3B82F6',
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#1E40AF',
                  marginBottom: 8,
                }}>
                  ℹ️ Why is this empty?
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#1E40AF',
                  lineHeight: 20,
                }}>
                  Reports show data only when:{'\n'}
                  • Tenants have made bookings for properties in {user?.barangay}{'\n'}
                  • Property owners have approved those bookings{'\n'}
                  • Tenants have provided their gender during registration{'\n\n'}
                  Once bookings are approved, the analytics will appear here automatically.
                </Text>
              </View>
            </View>

            {/* Refresh Button */}
            <TouchableOpacity
              onPress={loadAnalytics}
              style={[sharedStyles.primaryButton, { marginTop: designTokens.spacing.lg }]}
              activeOpacity={0.8}
            >
              <Text style={sharedStyles.primaryButtonText}>
                🔄 Refresh Analytics
              </Text>
            </TouchableOpacity>
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
              <Text style={sharedStyles.pageTitle}>Reports & Analytics</Text>
              <Text style={sharedStyles.pageSubtitle}>
                Tenant demographics for {user?.barangay || 'your barangay'}
              </Text>
            </View>
          </View>

          {/* Summary Card */}
          <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={[sharedStyles.statIcon, { backgroundColor: '#3B82F6' }]}>
                <Users size={24} color="white" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={sharedStyles.statSubtitle}>Total Tenants</Text>
                <Text style={[sharedStyles.statLabel, { fontSize: 32 }]}>
                  {analytics.total}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>
              Approved bookings in {user?.barangay}
            </Text>
          </View>

          {/* Gender Analytics */}
          <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={[sharedStyles.statIcon, { backgroundColor: '#10B981' }]}>
                <TrendingUp size={24} color="white" />
              </View>
              <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>
                Gender Distribution
              </Text>
            </View>

            {/* Male Section */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={sharedStyles.statLabel}>👨 Male</Text>
                <Text style={sharedStyles.statLabel}>
                  {analytics.male} ({analytics.malePercentage}%)
                </Text>
              </View>
              <View style={{
                height: 12,
                backgroundColor: '#E5E7EB',
                borderRadius: 6,
                overflow: 'hidden',
              }}>
                <View style={{
                  height: '100%',
                  width: `${analytics.malePercentage}%`,
                  backgroundColor: '#3B82F6',
                }} />
              </View>
            </View>

            {/* Female Section */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={sharedStyles.statLabel}>👩 Female</Text>
                <Text style={sharedStyles.statLabel}>
                  {analytics.female} ({analytics.femalePercentage}%)
                </Text>
              </View>
              <View style={{
                height: 12,
                backgroundColor: '#E5E7EB',
                borderRadius: 6,
                overflow: 'hidden',
              }}>
                <View style={{
                  height: '100%',
                  width: `${analytics.femalePercentage}%`,
                  backgroundColor: '#EC4899',
                }} />
              </View>
            </View>

            {/* Unknown Section */}
            {analytics.unknown > 0 && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={sharedStyles.statLabel}>❓ Not Specified</Text>
                  <Text style={sharedStyles.statLabel}>{analytics.unknown}</Text>
                </View>
                <View style={{
                  height: 12,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    width: `${Math.round((analytics.unknown / analytics.total) * 100)}%`,
                    backgroundColor: '#9CA3AF',
                  }} />
                </View>
              </View>
            )}
          </View>

          {/* Info Note */}
          <View style={{
            backgroundColor: '#EFF6FF',
            borderRadius: 12,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#3B82F6',
          }}>
            <Text style={{
              fontSize: 13,
              color: '#1E40AF',
              lineHeight: 20,
            }}>
              💡 <Text style={{ fontWeight: '600' }}>Note:</Text> This analytics counts tenants with approved bookings (when owners accept payments) in {user?.barangay}. Data is based on tenant gender information provided during account registration.
            </Text>
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            onPress={loadAnalytics}
            style={[sharedStyles.primaryButton, { marginTop: designTokens.spacing.lg }]}
            activeOpacity={0.8}
          >
            <Text style={sharedStyles.primaryButtonText}>
              🔄 Refresh Analytics
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
