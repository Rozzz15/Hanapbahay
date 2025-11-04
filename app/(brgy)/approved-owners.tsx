import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord, OwnerApplicationRecord } from '../../types';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { 
  CheckCircle, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Home,
  Users,
  Building
} from 'lucide-react-native';

interface ApprovedOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  barangay: string;
  createdAt: string;
  propertyCount: number;
  approvedDate: string;
}

export default function ApprovedOwners() {
  const { user } = useAuth();
  const router = useRouter();
  const [owners, setOwners] = useState<ApprovedOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [barangay, setBarangay] = useState('');
  const [stats, setStats] = useState({
    totalOwners: 0,
    totalProperties: 0,
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get barangay from user
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      const userBarangay = userRecord?.barangay || '';
      setBarangay(userBarangay);

      // Get all users and applications
      const allUsers = await db.list<DbUserRecord>('users');
      const allListings = await db.list<PublishedListingRecord>('published_listings');
      
      // Get approved applications in this barangay - this is the source of truth
      const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
      const approvedApplicationsInBarangay = allApplications.filter(
        app => app.status === 'approved' && app.barangay?.toUpperCase() === userBarangay.toUpperCase()
      );
      
      // Build approved owners list from approved applications
      const approvedOwners: ApprovedOwner[] = [];
      
      for (const application of approvedApplicationsInBarangay) {
        // Find the user record for this application
        const owner = allUsers.find(u => u.id === application.userId);
        
        if (!owner) {
          console.warn(`⚠️ Owner user not found for application ${application.id}, userId: ${application.userId}`);
          continue;
        }
        
        // Count properties for this owner
        const ownerProperties = allListings.filter(
          l => l.userId === owner.id
        );
        
        // Use reviewedAt as the official approval date (when barangay reviewed it)
        const approvalDate = application.reviewedAt || application.createdAt || new Date().toISOString();
        
        approvedOwners.push({
          id: owner.id,
          name: application.name || owner.name || 'Unknown',
          email: application.email || owner.email || '',
          phone: application.contactNumber || owner.phone || '',
          barangay: application.barangay || owner.barangay || '',
          createdAt: owner.createdAt || application.createdAt || new Date().toISOString(),
          propertyCount: ownerProperties.length,
          approvedDate: approvalDate,
        });
      }

      // Sort by approved date (most recent first)
      approvedOwners.sort((a, b) => 
        new Date(b.approvedDate).getTime() - new Date(a.approvedDate).getTime()
      );

      setOwners(approvedOwners);
      
      // Calculate stats
      const totalProperties = approvedOwners.reduce((sum, owner) => sum + owner.propertyCount, 0);
      setStats({
        totalOwners: approvedOwners.length,
        totalProperties: totalProperties,
      });

    } catch (error) {
      console.error('Error loading approved owners:', error);
      Alert.alert('Error', 'Failed to load approved owners');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const renderOwner = (owner: ApprovedOwner, index: number) => (
    <TouchableOpacity
      key={owner.id}
      style={[sharedStyles.listItem, { marginBottom: 16 }]}
    >
      <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
        <CheckCircle size={20} color="#10B981" />
      </View>
      <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
        <Text style={[sharedStyles.statLabel, { marginBottom: 4 }]}>
          {owner.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Mail size={14} color="#6B7280" />
          <Text style={[sharedStyles.statSubtitle, { fontSize: 13 }]}>
            {owner.email}
          </Text>
        </View>
        {owner.phone && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Phone size={14} color="#6B7280" />
            <Text style={[sharedStyles.statSubtitle, { fontSize: 13 }]}>
              {owner.phone}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Building size={14} color="#10B981" />
            <Text style={[sharedStyles.statSubtitle, { color: '#10B981', fontWeight: '600' }]}>
              {owner.propertyCount} {owner.propertyCount === 1 ? 'property' : 'properties'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading approved owners...</Text>
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
              <Text style={sharedStyles.pageTitle}>Approved Owners</Text>
              <Text style={sharedStyles.pageSubtitle}>
                BRGY {barangay.toUpperCase()}, LOPEZ, QUEZON
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={sharedStyles.section}>
            <Text style={sharedStyles.sectionTitle}>Summary</Text>
            <View style={sharedStyles.grid}>
              <View style={sharedStyles.gridItem}>
                <View style={sharedStyles.statCard}>
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                      <Users size={20} color="#3B82F6" />
                    </View>
                  </View>
                  <Text style={sharedStyles.statLabel}>Total Owners</Text>
                  <Text style={sharedStyles.statValue}>{stats.totalOwners}</Text>
                  <Text style={sharedStyles.statSubtitle}>Approved accounts</Text>
                </View>
              </View>

              <View style={sharedStyles.gridItem}>
                <View style={sharedStyles.statCard}>
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
                      <Building size={20} color="#10B981" />
                    </View>
                  </View>
                  <Text style={sharedStyles.statLabel}>Total Properties</Text>
                  <Text style={sharedStyles.statValue}>{stats.totalProperties}</Text>
                  <Text style={sharedStyles.statSubtitle}>Listed by owners</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Owners List */}
          {owners.length === 0 ? (
            <View style={sharedStyles.card}>
              <View style={{ alignItems: 'center', padding: 32 }}>
                <User size={48} color="#9CA3AF" />
                <Text style={[sharedStyles.sectionTitle, { marginTop: 16 }]}>
                  No Approved Owners
                </Text>
                <Text style={sharedStyles.statSubtitle}>
                  No owners have been approved in this barangay yet
                </Text>
              </View>
            </View>
          ) : (
            <View style={sharedStyles.section}>
              <Text style={sharedStyles.sectionTitle}>
                All Approved Owners ({owners.length})
              </Text>
              {owners.map((owner, index) => renderOwner(owner, index))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

