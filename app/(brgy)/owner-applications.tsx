import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../utils/db';
import { OwnerApplicationRecord, BrgyNotificationRecord } from '../../types';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { 
  CheckCircle, 
  XCircle, 
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  AlertCircle
} from 'lucide-react-native';

export default function OwnerApplications() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<OwnerApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<OwnerApplicationRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [barangay, setBarangay] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get barangay from user
      const userRecord = await db.get('users', user.id);
      const userBarangay = userRecord?.barangay || '';
      setBarangay(userBarangay);

      // Get all applications for this barangay
      const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
      const barangayApplications = allApplications.filter(
        app => app.barangay.toUpperCase() === userBarangay.toUpperCase()
      );

      // Sort by creation date (newest first)
      barangayApplications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setApplications(barangayApplications);
    } catch (error) {
      console.error('Error loading applications:', error);
      Alert.alert('Error', 'Failed to load owner applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: OwnerApplicationRecord) => {
    Alert.alert(
      'Approve Application',
      `Are you sure you want to approve ${application.name}'s owner application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // Update application status
              const updatedApplication = {
                ...application,
                status: 'approved' as const,
                reviewedBy: user?.id,
                reviewedAt: new Date().toISOString(),
              };
              
              await db.upsert('owner_applications', application.id, updatedApplication);

              // Update user role to owner
              const userRecord = await db.get('users', application.userId);
              if (userRecord) {
                const updatedUser = {
                  ...userRecord,
                  role: 'owner',
                  // Also update the roles array if it exists for AuthContext compatibility
                  roles: ['owner'],
                  updatedAt: new Date().toISOString(),
                };
                await db.upsert('users', application.userId, updatedUser);
                console.log('✅ User role updated to owner:', updatedUser);
              }

              // Delete notification
              const notifications = await db.list<BrgyNotificationRecord>('brgy_notifications');
              const notification = notifications.find(
                notif => notif.ownerApplicationId === application.id && notif.barangay === barangay
              );
              
              if (notification) {
                await db.remove('brgy_notifications', notification.id);
              }

              Alert.alert('Success', 'Application approved successfully!');
              setShowModal(false);
              loadData();
            } catch (error) {
              console.error('Error approving application:', error);
              Alert.alert('Error', 'Failed to approve application');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (application: OwnerApplicationRecord) => {
    Alert.alert(
      'Reject Application',
      `Are you sure you want to reject ${application.name}'s owner application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update application status
              const updatedApplication = {
                ...application,
                status: 'rejected' as const,
                reviewedBy: user?.id,
                reviewedAt: new Date().toISOString(),
              };
              
              await db.upsert('owner_applications', application.id, updatedApplication);

              // Delete notification
              const notifications = await db.list<BrgyNotificationRecord>('brgy_notifications');
              const notification = notifications.find(
                notif => notif.ownerApplicationId === application.id && notif.barangay === barangay
              );
              
              if (notification) {
                await db.remove('brgy_notifications', notification.id);
              }

              Alert.alert('Success', 'Application rejected.');
              setShowModal(false);
              loadData();
            } catch (error) {
              console.error('Error rejecting application:', error);
              Alert.alert('Error', 'Failed to reject application');
            }
          },
        },
      ]
    );
  };

  const openModal = (application: OwnerApplicationRecord) => {
    setSelectedApplication(application);
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color="#10B981" />;
      case 'rejected':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <AlertCircle size={16} color="#F59E0B" />;
    }
  };

  const renderApplication = (application: OwnerApplicationRecord, index: number) => (
    <TouchableOpacity
      key={application.id}
      style={[sharedStyles.listItem, { marginBottom: 16 }]}
      onPress={() => openModal(application)}
    >
      <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
        <FileText size={20} color="#3B82F6" />
      </View>
      <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
        <Text style={[sharedStyles.statLabel, { marginBottom: 4 }]}>
          {application.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {getStatusIcon(application.status)}
          <Text style={[sharedStyles.statSubtitle, { 
            color: getStatusColor(application.status),
            textTransform: 'capitalize'
          }]}>
            {application.status}
          </Text>
        </View>
        <Text style={[sharedStyles.statSubtitle, { marginTop: 4 }]}>
          {application.street}, {application.barangay}
        </Text>
      </View>
      <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');

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
              <Text style={sharedStyles.pageTitle}>Owner Applications</Text>
              <Text style={sharedStyles.pageSubtitle}>
                {pendingApplications.length} pending review
              </Text>
            </View>
          </View>

          {/* Pending Applications */}
          {pendingApplications.length === 0 ? (
            <View style={sharedStyles.card}>
              <View style={{ alignItems: 'center', padding: 32 }}>
                <FileText size={48} color="#9CA3AF" />
                <Text style={[sharedStyles.sectionTitle, { marginTop: 16 }]}>
                  No Pending Applications
                </Text>
                <Text style={sharedStyles.statSubtitle}>
                  All owner applications have been reviewed
                </Text>
              </View>
            </View>
          ) : (
            <View style={sharedStyles.section}>
              <Text style={sharedStyles.sectionTitle}>
                Pending Applications ({pendingApplications.length})
              </Text>
              {pendingApplications.map((app, index) => renderApplication(app, index))}
            </View>
          )}

          {/* Approved Applications */}
          {applications.filter(app => app.status === 'approved').length > 0 && (
            <View style={sharedStyles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={sharedStyles.sectionTitle}>
                  Approved Applications ({applications.filter(app => app.status === 'approved').length})
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/(brgy)/approved-owners' as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>View All</Text>
                  <Text style={{ fontSize: 16, color: '#3B82F6' }}>›</Text>
                </TouchableOpacity>
              </View>
              {applications
                .filter(app => app.status === 'approved')
                .slice(0, 3) // Show only recent 3
                .map((app, index) => renderApplication(app, index))}
            </View>
          )}

          {/* Rejected Applications */}
          {applications.filter(app => app.status === 'rejected').length > 0 && (
            <View style={sharedStyles.section}>
              <Text style={sharedStyles.sectionTitle}>
                Rejected Applications ({applications.filter(app => app.status === 'rejected').length})
              </Text>
              {applications
                .filter(app => app.status === 'rejected')
                .slice(0, 3) // Show only recent 3
                .map((app, index) => renderApplication(app, index))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Application Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        {selectedApplication && (
          <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={{ padding: 24 }}>
              {/* Header */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 24 
              }}>
                <Text style={sharedStyles.pageTitle}>Application Details</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={[sharedStyles.primaryButtonText, { color: '#6B7280' }]}>Close</Text>
                </TouchableOpacity>
              </View>

              {/* Personal Information */}
              <View style={sharedStyles.card}>
                <Text style={sharedStyles.sectionTitle}>Personal Information</Text>
                <View style={{ gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <User size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>Name: {selectedApplication.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Mail size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>{selectedApplication.email}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Phone size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>{selectedApplication.contactNumber}</Text>
                  </View>
                </View>
              </View>

              {/* Business Address */}
              <View style={[sharedStyles.card, { marginTop: 16 }]}>
                <Text style={sharedStyles.sectionTitle}>Business Address</Text>
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Home size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>
                      {selectedApplication.houseNumber} {selectedApplication.street}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>{selectedApplication.barangay} Barangay</Text>
                  </View>
                </View>
              </View>

              {/* Government ID */}
              {selectedApplication.govIdUri && (
                <View style={[sharedStyles.card, { marginTop: 16 }]}>
                  <Text style={sharedStyles.sectionTitle}>Government ID</Text>
                  <Image
                    source={{ uri: selectedApplication.govIdUri }}
                    style={{ 
                      width: '100%', 
                      height: 300, 
                      borderRadius: 12, 
                      marginTop: 12 
                    }}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Action Buttons */}
              {selectedApplication.status === 'pending' && (
                <View style={{ marginTop: 32, gap: 12 }}>
                  <TouchableOpacity
                    style={[sharedStyles.primaryButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleApprove(selectedApplication)}
                  >
                    <CheckCircle size={18} color="white" />
                    <Text style={sharedStyles.primaryButtonText}>Approve Application</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[sharedStyles.primaryButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleReject(selectedApplication)}
                  >
                    <XCircle size={18} color="white" />
                    <Text style={sharedStyles.primaryButtonText}>Reject Application</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}
