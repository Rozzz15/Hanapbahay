import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, AlertCircle, CheckCircle, Clock, FileText, X } from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { getComplaintsByTenant, getComplaintCategoryLabel, getStatusLabel, getUrgencyColor } from '../../utils/tenant-complaints';
import { TenantComplaintRecord } from '../../types';
import { db } from '../../utils/db';
import { PublishedListingRecord } from '../../types';

export default function ComplaintTrackingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<TenantComplaintRecord[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<TenantComplaintRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [property, setProperty] = useState<PublishedListingRecord | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const loadComplaints = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Check if tenant has active booking
      const { getBookingsByTenant } = await import('../../utils/booking');
      const bookings = await getBookingsByTenant(user.id);
      const active = bookings.find(
        b => b.status === 'approved' && b.paymentStatus === 'paid'
      );
      
      if (!active) {
        // No active booking - show message and allow viewing past complaints
        Alert.alert(
          'No Active Rental',
          'You need to have an active rental booking to submit new complaints. You can still view your past complaints below.',
          [{ text: 'OK' }]
        );
      }
      
      const tenantComplaints = await getComplaintsByTenant(user.id);
      setComplaints(tenantComplaints);
    } catch (error) {
      console.error('❌ Error loading complaints:', error);
      Alert.alert('Error', 'Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [loadComplaints])
  );

  const handleViewDetails = async (complaint: TenantComplaintRecord) => {
    setSelectedComplaint(complaint);
    
    // Load property details
    if (complaint.propertyId) {
      const propertyData = await db.get<PublishedListingRecord>('published_listings', complaint.propertyId);
      setProperty(propertyData || null);
    }
    
    setShowDetailModal(true);
  };

  const getStatusIcon = (status: TenantComplaintRecord['status']) => {
    switch (status) {
      case 'submitted':
        return <Clock size={16} color={designTokens.colors.warning} />;
      case 'received_by_brgy':
        return <AlertCircle size={16} color={designTokens.colors.info} />;
      case 'under_review':
        return <FileText size={16} color={designTokens.colors.info} />;
      case 'for_mediation':
        return <AlertCircle size={16} color={designTokens.colors.warning} />;
      case 'resolved':
        return <CheckCircle size={16} color={designTokens.colors.success} />;
      case 'closed':
        return <CheckCircle size={16} color={designTokens.colors.textMuted} />;
      default:
        return <AlertCircle size={16} color={designTokens.colors.textMuted} />;
    }
  };

  const getStatusColor = (status: TenantComplaintRecord['status']) => {
    switch (status) {
      case 'submitted':
        return designTokens.colors.warning;
      case 'received_by_brgy':
        return designTokens.colors.info;
      case 'under_review':
        return designTokens.colors.info;
      case 'for_mediation':
        return designTokens.colors.warning;
      case 'resolved':
        return designTokens.colors.success;
      case 'closed':
        return designTokens.colors.textMuted;
      default:
        return designTokens.colors.textMuted;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.container}>
        <View style={sharedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primary} />
          <Text style={sharedStyles.loadingText}>Loading complaints...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={designTokens.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Complaint Tracking</Text>
            <View style={{ width: 40 }} />
          </View>

          {complaints.length === 0 ? (
            <View style={sharedStyles.card}>
              <View style={styles.emptyState}>
                <AlertCircle size={48} color={designTokens.colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No Complaints Yet</Text>
                <Text style={styles.emptyStateText}>
                  You haven&apos;t submitted any complaints. Use the &quot;Submit Complaint&quot; button to report issues.
                </Text>
                <TouchableOpacity
                  style={sharedStyles.primaryButton}
                  onPress={async () => {
                    // Check if tenant has active booking before allowing submission
                    const { getBookingsByTenant } = await import('../../utils/booking');
                    const bookings = await getBookingsByTenant(user?.id || '');
                    const active = bookings.find(
                      b => b.status === 'approved' && b.paymentStatus === 'paid'
                    );
                    
                    if (!active) {
                      Alert.alert(
                        'No Active Rental',
                        'You need to have an active rental booking to submit a complaint. Please contact your barangay directly if you have an urgent issue.'
                      );
                      return;
                    }
                    
                    router.push('/(tabs)/submit-complaint');
                  }}
                >
                  <Text style={sharedStyles.primaryButtonText}>Submit Complaint</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={sharedStyles.card}>
                <Text style={styles.summaryTitle}>Your Complaints</Text>
                <Text style={styles.summaryText}>
                  {complaints.length} complaint{complaints.length > 1 ? 's' : ''} total
                </Text>
              </View>

              {complaints.map((complaint) => (
                <TouchableOpacity
                  key={complaint.id}
                  style={sharedStyles.card}
                  onPress={() => handleViewDetails(complaint)}
                  activeOpacity={0.7}
                >
                  <View style={styles.complaintHeader}>
                    <View style={styles.complaintHeaderLeft}>
                      <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor(complaint.status)}20` }]}>
                        {getStatusIcon(complaint.status)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.complaintCategory}>
                          {getComplaintCategoryLabel(complaint.category)}
                        </Text>
                        <Text style={styles.complaintDate}>
                          Submitted {new Date(complaint.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(complaint.status)}20` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(complaint.status) }]}>
                        {getStatusLabel(complaint.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.complaintDescription} numberOfLines={2}>
                    {complaint.description}
                  </Text>

                  <View style={styles.complaintFooter}>
                    <View style={[styles.urgencyBadge, { backgroundColor: `${getUrgencyColor(complaint.urgency)}20` }]}>
                      <Text style={[styles.urgencyText, { color: getUrgencyColor(complaint.urgency) }]}>
                        {complaint.urgency.toUpperCase()}
                      </Text>
                    </View>
                    {(complaint.photos.length > 0 || complaint.videos.length > 0) && (
                      <Text style={styles.mediaCount}>
                        {complaint.photos.length} photo{complaint.photos.length > 1 ? 's' : ''}
                        {complaint.videos.length > 0 && `, ${complaint.videos.length} video${complaint.videos.length > 1 ? 's' : ''}`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Complaint Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedComplaint(null);
          setProperty(null);
          setSelectedPhotoIndex(null);
        }}
      >
        <SafeAreaView style={sharedStyles.container}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complaint Details</Text>
            <TouchableOpacity
              onPress={() => {
                setShowDetailModal(false);
                setSelectedComplaint(null);
                setProperty(null);
                setSelectedPhotoIndex(null);
              }}
            >
              <X size={24} color={designTokens.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={sharedStyles.scrollView}>
            {selectedComplaint && (
              <View style={sharedStyles.pageContainer}>
                <View style={sharedStyles.card}>
                  <View style={styles.detailHeader}>
                    <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor(selectedComplaint.status)}20` }]}>
                      {getStatusIcon(selectedComplaint.status)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailCategory}>
                        {getComplaintCategoryLabel(selectedComplaint.category)}
                      </Text>
                      <Text style={styles.detailStatus}>
                        Status: {getStatusLabel(selectedComplaint.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.urgencyBadge, { backgroundColor: `${getUrgencyColor(selectedComplaint.urgency)}20`, alignSelf: 'flex-start', marginTop: designTokens.spacing.md }]}>
                    <Text style={[styles.urgencyText, { color: getUrgencyColor(selectedComplaint.urgency) }]}>
                      {selectedComplaint.urgency.toUpperCase()} PRIORITY
                    </Text>
                  </View>
                </View>

                <View style={sharedStyles.card}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.detailDescription}>{selectedComplaint.description}</Text>
                </View>

                {property && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>Property</Text>
                    <Text style={styles.detailText}>{property.address}</Text>
                  </View>
                )}

                {selectedComplaint.photos.length > 0 && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>
                      Photos ({selectedComplaint.photos.length})
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedComplaint.photos.map((photo, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setSelectedPhotoIndex(index)}
                          style={styles.photoThumbnail}
                        >
                          <Image source={{ uri: photo }} style={styles.thumbnailImage} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedComplaint.videos.length > 0 && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>
                      Videos ({selectedComplaint.videos.length})
                    </Text>
                    <Text style={styles.detailText}>
                      {selectedComplaint.videos.length} video{selectedComplaint.videos.length > 1 ? 's' : ''} attached
                    </Text>
                  </View>
                )}

                {selectedComplaint.barangayNotes && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>Barangay Notes</Text>
                    <Text style={styles.detailText}>{selectedComplaint.barangayNotes}</Text>
                  </View>
                )}

                {selectedComplaint.settlementDocuments && selectedComplaint.settlementDocuments.length > 0 && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>Settlement Documents</Text>
                    <Text style={styles.detailText}>
                      {selectedComplaint.settlementDocuments.length} document{selectedComplaint.settlementDocuments.length > 1 ? 's' : ''} uploaded
                    </Text>
                  </View>
                )}

                <View style={sharedStyles.card}>
                  <Text style={styles.detailSectionTitle}>Timeline</Text>
                  <Text style={styles.detailText}>
                    Submitted: {new Date(selectedComplaint.createdAt).toLocaleString()}
                  </Text>
                  {selectedComplaint.resolvedAt && (
                    <Text style={styles.detailText}>
                      Resolved: {new Date(selectedComplaint.resolvedAt).toLocaleString()}
                    </Text>
                  )}
                  {selectedComplaint.closedAt && (
                    <Text style={styles.detailText}>
                      Closed: {new Date(selectedComplaint.closedAt).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Photo Viewer Modal */}
      {selectedComplaint && selectedPhotoIndex !== null && (
        <Modal
          visible={selectedPhotoIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhotoIndex(null)}
        >
          <View style={styles.photoViewer}>
            <TouchableOpacity
              style={styles.photoViewerClose}
              onPress={() => setSelectedPhotoIndex(null)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedComplaint.photos[selectedPhotoIndex] }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  },
  backButton: {
    padding: designTokens.spacing.xs,
  },
  headerTitle: {
    fontSize: designTokens.typography.xl,
    fontWeight: designTokens.typography.bold as any,
    color: designTokens.colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing['2xl'],
  },
  emptyStateTitle: {
    fontSize: designTokens.typography.lg,
    fontWeight: designTokens.typography.semibold as any,
    color: designTokens.colors.textPrimary,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xs,
  },
  emptyStateText: {
    fontSize: designTokens.typography.base,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.lg,
  },
  summaryTitle: {
    fontSize: designTokens.typography.lg,
    fontWeight: designTokens.typography.semibold as any,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
  },
  summaryText: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
  },
  complaintHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.sm,
  },
  complaintHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: designTokens.spacing.sm,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complaintCategory: {
    fontSize: designTokens.typography.base,
    fontWeight: designTokens.typography.semibold as any,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
  },
  complaintDate: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  },
  statusText: {
    fontSize: designTokens.typography.xs,
    fontWeight: designTokens.typography.semibold as any,
  },
  complaintDescription: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.sm,
  },
  complaintFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: designTokens.spacing.xs,
  },
  urgencyBadge: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  },
  urgencyText: {
    fontSize: designTokens.typography.xs,
    fontWeight: designTokens.typography.bold as any,
  },
  mediaCount: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.border,
  },
  modalTitle: {
    fontSize: designTokens.typography.xl,
    fontWeight: designTokens.typography.bold as any,
    color: designTokens.colors.textPrimary,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: designTokens.spacing.md,
  },
  detailCategory: {
    fontSize: designTokens.typography.lg,
    fontWeight: designTokens.typography.bold as any,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
  },
  detailStatus: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
  },
  detailSectionTitle: {
    fontSize: designTokens.typography.base,
    fontWeight: designTokens.typography.semibold as any,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  detailDescription: {
    fontSize: designTokens.typography.base,
    color: designTokens.colors.textSecondary,
    lineHeight: 22,
  },
  detailText: {
    fontSize: designTokens.typography.base,
    color: designTokens.colors.textSecondary,
  },
  photoThumbnail: {
    marginRight: designTokens.spacing.sm,
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: designTokens.borderRadius.md,
  },
  photoViewer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: designTokens.spacing.sm,
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
  },
});

