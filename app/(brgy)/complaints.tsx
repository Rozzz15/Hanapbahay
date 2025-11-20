import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  X,
  ArrowLeft,
  Edit,
  Upload,
  User,
  MapPin,
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord, TenantComplaintRecord } from '../../types';
import {
  getComplaintsByBarangay,
  getComplaintWithDetails,
  updateComplaintStatus,
  addSettlementDocuments,
  getComplaintCategoryLabel,
  getStatusLabel,
  getUrgencyColor,
} from '../../utils/tenant-complaints';
import * as ImagePicker from 'expo-image-picker';

export default function ComplaintsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<TenantComplaintRecord[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<TenantComplaintRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [barangayName, setBarangayName] = useState('');
  const [complaintDetails, setComplaintDetails] = useState<{
    complaint: TenantComplaintRecord;
    tenant?: DbUserRecord;
    property?: PublishedListingRecord;
  } | null>(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | TenantComplaintRecord['status']>('all');

  const loadComplaints = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get barangay name from user data
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      const barangay = userRecord?.barangay || 'Unknown Barangay';
      setBarangayName(barangay);

      const barangayComplaints = await getComplaintsByBarangay(barangay);
      setComplaints(barangayComplaints);
    } catch (error) {
      console.error('❌ Error loading complaints:', error);
      Alert.alert('Error', 'Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user || !user.roles?.includes('brgy_official')) {
      router.replace('/login');
      return;
    }
    loadComplaints();
  }, [user, router, loadComplaints]);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [loadComplaints])
  );

  const handleViewDetails = async (complaint: TenantComplaintRecord) => {
    setSelectedComplaint(complaint);
    const details = await getComplaintWithDetails(complaint.id);
    setComplaintDetails(details);
    setStatusNotes(complaint.barangayNotes || '');
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (newStatus: TenantComplaintRecord['status']) => {
    if (!selectedComplaint) return;

    try {
      setUpdating(true);
      await updateComplaintStatus(selectedComplaint.id, newStatus, statusNotes || undefined);
      
      Alert.alert('Success', `Complaint status updated to ${getStatusLabel(newStatus)}.`);
      setShowStatusModal(false);
      setShowDetailModal(false);
      await loadComplaints();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddSettlementDocuments = async () => {
    if (!selectedComplaint) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll access to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const documentUris = result.assets.map(asset => asset.uri);
        await addSettlementDocuments(selectedComplaint.id, documentUris);
        Alert.alert('Success', 'Settlement documents uploaded successfully.');
        await loadComplaints();
        if (complaintDetails) {
          const updated = await getComplaintWithDetails(selectedComplaint.id);
          setComplaintDetails(updated);
        }
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      Alert.alert('Error', 'Failed to upload documents. Please try again.');
    }
  };

  const getStatusIcon = (status: TenantComplaintRecord['status']) => {
    switch (status) {
      case 'submitted':
        return <Clock size={16} color={designTokens.colors.warning} />;
      case 'received_by_brgy':
        return <AlertTriangle size={16} color={designTokens.colors.info} />;
      case 'under_review':
        return <FileText size={16} color={designTokens.colors.info} />;
      case 'for_mediation':
        return <AlertTriangle size={16} color={designTokens.colors.warning} />;
      case 'resolved':
        return <CheckCircle size={16} color={designTokens.colors.success} />;
      case 'closed':
        return <CheckCircle size={16} color={designTokens.colors.textMuted} />;
      default:
        return <AlertTriangle size={16} color={designTokens.colors.textMuted} />;
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

  const filteredComplaints = filterStatus === 'all'
    ? complaints
    : complaints.filter(c => c.status === filterStatus);

  const newComplaints = complaints.filter(c => c.status === 'submitted').length;

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={designTokens.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complaints</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'all' && styles.filterTabTextActive]}>
              All ({complaints.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'submitted' && styles.filterTabActive]}
            onPress={() => setFilterStatus('submitted')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'submitted' && styles.filterTabTextActive]}>
              New ({newComplaints})
            </Text>
            {newComplaints > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{newComplaints}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'under_review' && styles.filterTabActive]}
            onPress={() => setFilterStatus('under_review')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'under_review' && styles.filterTabTextActive]}>
              Under Review
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'for_mediation' && styles.filterTabActive]}
            onPress={() => setFilterStatus('for_mediation')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'for_mediation' && styles.filterTabTextActive]}>
              For Mediation
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'resolved' && styles.filterTabActive]}
            onPress={() => setFilterStatus('resolved')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'resolved' && styles.filterTabTextActive]}>
              Resolved
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          {filteredComplaints.length === 0 ? (
            <View style={sharedStyles.card}>
              <View style={styles.emptyState}>
                <AlertTriangle size={48} color={designTokens.colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No Complaints</Text>
                <Text style={styles.emptyStateText}>
                  {filterStatus === 'all'
                    ? 'No complaints have been submitted yet.'
                    : `No complaints with status "${getStatusLabel(filterStatus as TenantComplaintRecord['status'])}".`}
                </Text>
              </View>
            </View>
          ) : (
            filteredComplaints.map((complaint) => (
              <TouchableOpacity
                key={complaint.id}
                style={[
                  sharedStyles.card,
                  complaint.status === 'submitted' && styles.newComplaintCard,
                ]}
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
                        {new Date(complaint.createdAt).toLocaleDateString()}
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
                  {complaint.isAnonymous ? (
                    <Text style={styles.anonymousLabel}>Anonymous</Text>
                  ) : (
                    <Text style={styles.mediaCount}>
                      {complaint.photos.length + complaint.videos.length} media
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
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
          setComplaintDetails(null);
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
                setComplaintDetails(null);
                setSelectedPhotoIndex(null);
              }}
            >
              <X size={24} color={designTokens.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={sharedStyles.scrollView}>
            {selectedComplaint && complaintDetails && (
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

                {complaintDetails.property && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>Property</Text>
                    <View style={styles.propertyInfo}>
                      <MapPin size={16} color={designTokens.colors.textSecondary} />
                      <Text style={styles.detailText}>{complaintDetails.property.address}</Text>
                    </View>
                  </View>
                )}

                {!selectedComplaint.isAnonymous && complaintDetails.tenant && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>Tenant Information</Text>
                    <View style={styles.tenantInfo}>
                      <User size={16} color={designTokens.colors.textSecondary} />
                      <Text style={styles.detailText}>{complaintDetails.tenant.name}</Text>
                    </View>
                    <View style={styles.tenantInfo}>
                      <FileText size={16} color={designTokens.colors.textSecondary} />
                      <Text style={styles.detailText}>{complaintDetails.tenant.email}</Text>
                    </View>
                    <View style={styles.tenantInfo}>
                      <FileText size={16} color={designTokens.colors.textSecondary} />
                      <Text style={styles.detailText}>{complaintDetails.tenant.phone}</Text>
                    </View>
                  </View>
                )}

                {selectedComplaint.isAnonymous && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>Tenant Information</Text>
                    <Text style={styles.detailText}>Submitted anonymously</Text>
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

                <View style={sharedStyles.card}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.detailSectionTitle}>Barangay Notes</Text>
                    <TouchableOpacity
                      onPress={() => setShowNotesModal(true)}
                      style={styles.editButton}
                    >
                      <Edit size={16} color={designTokens.colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.detailText}>
                    {selectedComplaint.barangayNotes || 'No notes added yet.'}
                  </Text>
                </View>

                {selectedComplaint.settlementDocuments && selectedComplaint.settlementDocuments.length > 0 && (
                  <View style={sharedStyles.card}>
                    <Text style={styles.detailSectionTitle}>
                      Settlement Documents ({selectedComplaint.settlementDocuments.length})
                    </Text>
                    <Text style={styles.detailText}>
                      {selectedComplaint.settlementDocuments.length} document{selectedComplaint.settlementDocuments.length > 1 ? 's' : ''} uploaded
                    </Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[sharedStyles.secondaryButton, { flex: 1 }]}
                    onPress={() => setShowStatusModal(true)}
                  >
                    <Edit size={16} color={designTokens.colors.primary} />
                    <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.primary }]}>
                      Update Status
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[sharedStyles.secondaryButton, { flex: 1 }]}
                    onPress={handleAddSettlementDocuments}
                  >
                    <Upload size={16} color={designTokens.colors.primary} />
                    <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.primary }]}>
                      Upload Documents
                    </Text>
                  </TouchableOpacity>
                </View>

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

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <Text style={styles.modalSubtitle}>Select new status for this complaint</Text>

            {(['received_by_brgy', 'under_review', 'for_mediation', 'resolved', 'closed'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.statusOption}
                onPress={() => handleUpdateStatus(status)}
                disabled={updating}
              >
                <Text style={styles.statusOptionText}>{getStatusLabel(status)}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[sharedStyles.secondaryButton, { marginTop: designTokens.spacing.md }]}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={sharedStyles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal
        visible={showNotesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter notes about this complaint..."
              placeholderTextColor={designTokens.colors.textMuted}
              multiline
              numberOfLines={6}
              value={statusNotes}
              onChangeText={setStatusNotes}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[sharedStyles.secondaryButton, { flex: 1 }]}
                onPress={() => setShowNotesModal(false)}
              >
                <Text style={sharedStyles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sharedStyles.primaryButton, { flex: 1 }]}
                onPress={async () => {
                  if (selectedComplaint) {
                    await updateComplaintStatus(selectedComplaint.id, selectedComplaint.status, statusNotes);
                    Alert.alert('Success', 'Notes updated successfully.');
                    setShowNotesModal(false);
                    await loadComplaints();
                    if (complaintDetails) {
                      const updated = await getComplaintWithDetails(selectedComplaint.id);
                      setComplaintDetails(updated);
                    }
                  }
                }}
              >
                <Text style={sharedStyles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.border,
    backgroundColor: designTokens.colors.white,
  },
  backButton: {
    padding: designTokens.spacing.xs,
  },
  headerTitle: {
    fontSize: designTokens.typography.xl,
    fontWeight: designTokens.typography.bold as any,
    color: designTokens.colors.textPrimary,
  },
  filterContainer: {
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.border,
    paddingVertical: designTokens.spacing.sm,
  },
  filterTab: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    marginHorizontal: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  filterTabActive: {
    backgroundColor: designTokens.colors.primary,
  },
  filterTabText: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
    fontWeight: designTokens.typography.medium as any,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: designTokens.typography.semibold as any,
  },
  newBadge: {
    backgroundColor: designTokens.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  newComplaintCard: {
    borderLeftWidth: 4,
    borderLeftColor: designTokens.colors.error,
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
  anonymousLabel: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textMuted,
    fontStyle: 'italic',
  },
  mediaCount: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
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
    paddingHorizontal: designTokens.spacing.lg,
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
  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.sm,
  },
  editButton: {
    padding: designTokens.spacing.xs,
  },
  photoThumbnail: {
    marginRight: designTokens.spacing.sm,
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: designTokens.borderRadius.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: designTokens.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: designTokens.spacing.lg,
    maxHeight: '80%',
  },
  modalSubtitle: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.md,
  },
  statusOption: {
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    backgroundColor: designTokens.colors.background,
    marginBottom: designTokens.spacing.sm,
  },
  statusOptionText: {
    fontSize: designTokens.typography.base,
    color: designTokens.colors.textPrimary,
    fontWeight: designTokens.typography.medium as any,
  },
  notesInput: {
    minHeight: 120,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    fontSize: designTokens.typography.base,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
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

