import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Image, StyleSheet, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord, OwnerApplicationRecord, OwnerApplicationDocument } from '../../types';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import * as FileSystem from 'expo-file-system/legacy';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, cancelAnimation, runOnJS } from 'react-native-reanimated';
import { 
  CheckCircle, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Home,
  Users,
  Building,
  X,
  FileText,
  Download
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ApprovedOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  barangay: string;
  createdAt: string;
  propertyCount: number;
  approvedDate: string;
  applicationId?: string;
  reviewedBy?: string;
  address?: string;
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
  const [selectedOwner, setSelectedOwner] = useState<ApprovedOwner | null>(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerListings, setOwnerListings] = useState<PublishedListingRecord[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [ownerApplication, setOwnerApplication] = useState<OwnerApplicationRecord | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<OwnerApplicationDocument | { uri: string; name: string } | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
          applicationId: application.id,
          reviewedBy: application.reviewedBy,
          address: `${application.houseNumber || ''} ${application.street || ''}`.trim() || owner.address || '',
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

  const handleViewOwner = async (owner: ApprovedOwner) => {
    setSelectedOwner(owner);
    setShowOwnerModal(true);
    setLoadingListings(true);
    
    try {
      // Load owner's listings
      const listings = await db.list<PublishedListingRecord>('published_listings');
      const ownerListings = listings.filter(l => l.userId === owner.id);
      setOwnerListings(ownerListings);
      
      // Load owner's application to get requirements
      if (owner.applicationId) {
        const application = await db.get<OwnerApplicationRecord>('owner_applications', owner.applicationId);
        setOwnerApplication(application || null);
      } else {
        // Fallback: try to find application by userId
        const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
        const application = allApplications.find(app => app.userId === owner.id && app.status === 'approved');
        setOwnerApplication(application || null);
      }
    } catch (error) {
      console.error('Error loading owner data:', error);
      Alert.alert('Error', 'Failed to load owner data');
    } finally {
      setLoadingListings(false);
    }
  };

  const openDocumentViewer = (document: OwnerApplicationDocument | { uri: string; name: string }) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const downloadDocument = async (document: OwnerApplicationDocument | { uri: string; name: string }) => {
    if (!document || !document.uri) {
      Alert.alert('Error', 'Document URI is missing');
      return;
    }

    try {
      setIsDownloading(true);
      console.log('📥 Starting download for:', document.name, document.uri);
      
      // Determine file extension from URI or default to jpg
      const uriLower = document.uri.toLowerCase();
      let extension = 'jpg';
      if (uriLower.includes('.png')) extension = 'png';
      else if (uriLower.includes('.pdf')) extension = 'pdf';
      else if (uriLower.includes('.jpeg')) extension = 'jpeg';
      
      const fileName = `${document.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${extension}`;
      
      if (Platform.OS === 'web') {
        // For web, create a download link
        try {
          if (typeof window !== 'undefined' && window.URL) {
            console.log('🌐 Web download: Fetching document...');
            const response = await fetch(document.uri);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log('✅ Web download completed');
            Alert.alert('Success', 'Document downloaded successfully!');
          } else {
            throw new Error('Web APIs not available');
          }
        } catch (error) {
          console.error('❌ Web download error:', error);
          Alert.alert('Error', `Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // For mobile platforms
        try {
          console.log('📱 Mobile download: Starting...');
          
          // Use cache directory for temporary storage before saving to device
          const tempFileUri = FileSystem.cacheDirectory + fileName;
          console.log('📁 Temporary location:', tempFileUri);
          
          let resultUri = tempFileUri;
          
          // Check if the source URI is a local file or remote URL
          const isLocalFile = document.uri.startsWith('file://') || document.uri.startsWith('/');
          
          if (isLocalFile) {
            // For local files, read and write to copy
            console.log('📋 Copying local file...');
            const sourceUri = document.uri.startsWith('file://') ? document.uri : `file://${document.uri}`;
            
            // Read the file as base64
            const base64 = await FileSystem.readAsStringAsync(sourceUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Write to temporary location
            await FileSystem.writeAsStringAsync(tempFileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            console.log('✅ File copied successfully');
            resultUri = tempFileUri;
          } else {
            // For remote URLs (http/https), use downloadAsync
            console.log('🌐 Downloading remote file...');
            const result = await FileSystem.downloadAsync(document.uri, tempFileUri);
            console.log('📥 Download result:', result);
            
            if (result.status === 200) {
              resultUri = result.uri;
            } else {
              throw new Error(`Download failed with status: ${result.status}`);
            }
          }
          
          // Save file directly to device storage
          try {
            const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(extension.toLowerCase());
            
            if (isImage) {
              // For images, try to save to Photos library using expo-media-library
              try {
                const MediaLibrary = await import('expo-media-library');
                
                // Request permissions
                const { status } = await MediaLibrary.requestPermissionsAsync();
                
                if (status === 'granted') {
                  // Save image to Photos library
                  const asset = await MediaLibrary.createAssetAsync(resultUri);
                  
                  // Try to add to a "Downloads" or "HanapBahay" album, or just save to default
                  try {
                    await MediaLibrary.createAlbumAsync('HanapBahay', asset, false);
                    console.log('✅ Image saved to Photos library in HanapBahay album');
                  } catch (albumError) {
                    // If album creation fails, the image is still saved to Photos
                    console.log('✅ Image saved to Photos library');
                  }
                  
                  Alert.alert('Success', 'Image saved to your Photos library!');
                } else {
                  // Permission denied, fall back to document directory
                  throw new Error('Media library permission denied');
                }
              } catch (mediaLibraryError) {
                console.log('⚠️ Media library not available or permission denied, using fallback');
                // Fallback: Save to document directory and use sharing
                await saveToDocumentDirectory(resultUri, fileName, extension);
              }
            } else {
              // For PDFs and other files, save to document directory and use sharing
              await saveToDocumentDirectory(resultUri, fileName, extension);
            }
          } catch (error) {
            console.error('⚠️ Error saving file:', error);
            // Final fallback: Save to document directory
            await saveToDocumentDirectory(resultUri, fileName, extension);
          }
          
          // Helper function to save to document directory and optionally share
          async function saveToDocumentDirectory(sourceUri: string, fileName: string, fileExtension: string) {
            const docFileUri = FileSystem.documentDirectory + fileName;
            
            // Copy file to document directory
            if (sourceUri !== docFileUri) {
              const base64 = await FileSystem.readAsStringAsync(sourceUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              await FileSystem.writeAsStringAsync(docFileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }
            
            // Try to use sharing to make it accessible
            try {
              const Sharing = await import('expo-sharing');
              if (await Sharing.isAvailableAsync()) {
                // Open share sheet so user can save to Downloads/Files
                await Sharing.shareAsync(docFileUri, {
                  mimeType: fileExtension === 'pdf' ? 'application/pdf' : `image/${fileExtension}`,
                  dialogTitle: 'Save Document',
                });
                Alert.alert('Success', 'File ready to save! Use the share menu to save to Downloads or Files.');
              } else {
                Alert.alert('Success', `File saved to app storage: ${docFileUri}`);
              }
            } catch (sharingError) {
              Alert.alert('Success', `File saved to app storage: ${docFileUri}`);
            }
          }
        } catch (error) {
          console.error('❌ Mobile download error:', error);
          Alert.alert('Error', `Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      Alert.alert('Error', `Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderOwner = (owner: ApprovedOwner, index: number) => (
    <TouchableOpacity
      key={owner.id}
      style={[sharedStyles.listItem, { marginBottom: 16 }]}
      onPress={() => handleViewOwner(owner)}
      activeOpacity={0.7}
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

      {/* Owner Details Modal */}
      <Modal
        visible={showOwnerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowOwnerModal(false);
          setOwnerApplication(null);
        }}
      >
        {selectedOwner && (
          <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={{ padding: 24 }}>
              {/* Header */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 24 
              }}>
                <Text style={sharedStyles.pageTitle}>Owner Details</Text>
                <TouchableOpacity onPress={() => {
                  setShowOwnerModal(false);
                  setOwnerApplication(null);
                }}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Approval Status */}
              <View style={[sharedStyles.card, { backgroundColor: '#ECFDF5', borderColor: '#10B981', borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={20} color="#10B981" />
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    Approved Owner Account
                  </Text>
                </View>
                <Text style={[sharedStyles.statSubtitle, { marginTop: 8, fontSize: 12 }]}>
                  Approved on {new Date(selectedOwner.approvedDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>

              {/* Personal Information */}
              <View style={[sharedStyles.card, { marginTop: 16 }]}>
                <Text style={sharedStyles.sectionTitle}>Personal Information</Text>
                <View style={{ gap: 16, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <User size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[sharedStyles.statSubtitle, { fontSize: 11, marginBottom: 2 }]}>Name</Text>
                      <Text style={sharedStyles.statLabel}>{selectedOwner.name}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Mail size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[sharedStyles.statSubtitle, { fontSize: 11, marginBottom: 2 }]}>Email</Text>
                      <Text style={sharedStyles.statLabel}>{selectedOwner.email}</Text>
                    </View>
                  </View>
                  {selectedOwner.phone && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Phone size={18} color="#6B7280" style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statSubtitle, { fontSize: 11, marginBottom: 2 }]}>Contact Number</Text>
                        <Text style={sharedStyles.statLabel}>{selectedOwner.phone}</Text>
                      </View>
                    </View>
                  )}
                  {selectedOwner.address && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Home size={18} color="#6B7280" style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statSubtitle, { fontSize: 11, marginBottom: 2 }]}>Address</Text>
                        <Text style={sharedStyles.statLabel}>{selectedOwner.address}</Text>
                      </View>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[sharedStyles.statSubtitle, { fontSize: 11, marginBottom: 2 }]}>Barangay</Text>
                      <Text style={sharedStyles.statLabel}>{selectedOwner.barangay}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Business Documents & Requirements */}
              {(ownerApplication?.documents?.length > 0 || ownerApplication?.govIdUri) && (
                <View style={[sharedStyles.card, { marginTop: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <FileText size={18} color="#10B981" />
                    <Text style={sharedStyles.sectionTitle}>Business Documents & Requirements</Text>
                  </View>
                  
                  {/* Display multiple documents if available */}
                  {ownerApplication.documents && ownerApplication.documents.length > 0 ? (
                    <View style={{ marginTop: 12, gap: 16 }}>
                      {ownerApplication.documents.map((doc, index) => (
                        <View key={doc.id || index} style={{ marginBottom: 16 }}>
                          <View style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: 8 
                          }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: '#374151',
                              flex: 1
                            }}>
                              {doc.name}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => openDocumentViewer(doc)} activeOpacity={0.9}>
                            <Image
                              source={{ uri: doc.uri }}
                              style={{ 
                                width: '100%', 
                                height: 300, 
                                borderRadius: 12,
                                backgroundColor: '#F3F4F6'
                              }}
                              resizeMode="contain"
                            />
                          </TouchableOpacity>
                          {doc.uploadedAt && (
                            <Text style={{
                              fontSize: 12,
                              color: '#6B7280',
                              marginTop: 4,
                              fontStyle: 'italic'
                            }}>
                              Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    /* Fallback to govIdUri for backward compatibility */
                    ownerApplication.govIdUri && (
                      <View style={{ marginTop: 12 }}>
                        <View style={{ 
                          flexDirection: 'row', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: 8 
                        }}>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#374151',
                            flex: 1
                          }}>
                            Government ID
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => openDocumentViewer({ uri: ownerApplication.govIdUri, name: 'Government ID' })} activeOpacity={0.9}>
                          <Image
                            source={{ uri: ownerApplication.govIdUri }}
                            style={{ 
                              width: '100%', 
                              height: 300, 
                              borderRadius: 12,
                              backgroundColor: '#F3F4F6'
                            }}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </View>
              )}

              {/* Properties List */}
              <View style={[sharedStyles.card, { marginTop: 16 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={sharedStyles.sectionTitle}>Properties</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Building size={16} color="#10B981" />
                    <Text style={[sharedStyles.statSubtitle, { color: '#10B981', fontWeight: '600' }]}>
                      {selectedOwner.propertyCount}
                    </Text>
                  </View>
                </View>
                
                {loadingListings ? (
                  <Text style={sharedStyles.statSubtitle}>Loading properties...</Text>
                ) : ownerListings.length === 0 ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Building size={32} color="#9CA3AF" />
                    <Text style={[sharedStyles.statSubtitle, { marginTop: 8 }]}>
                      No properties listed yet
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {ownerListings.map((listing) => (
                      <View 
                        key={listing.id} 
                        style={{ 
                          padding: 12, 
                          backgroundColor: '#F9FAFB', 
                          borderRadius: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: '#10B981'
                        }}
                      >
                        <Text style={[sharedStyles.statLabel, { marginBottom: 4 }]}>
                          {listing.propertyType || 'Property'}
                        </Text>
                        <Text style={[sharedStyles.statSubtitle, { fontSize: 12, marginBottom: 4 }]}>
                          {listing.address || 'No address'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                          <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                            ₱{listing.monthlyRent?.toLocaleString() || '0'}/month
                          </Text>
                          {listing.rooms && (
                            <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                              {listing.rooms} room{(listing.rooms || listing.bedrooms || 0) > 1 ? 's' : ''}
                            </Text>
                          )}
                          {listing.bathrooms && (
                            <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                              {listing.bathrooms} bath{listing.bathrooms > 1 ? 's' : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Account Information */}
              <View style={[sharedStyles.card, { marginTop: 16 }]}>
                <Text style={sharedStyles.sectionTitle}>Account Information</Text>
                <View style={{ gap: 12, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[sharedStyles.statSubtitle, { fontSize: 12 }]}>Account Created</Text>
                    <Text style={[sharedStyles.statLabel, { fontSize: 12 }]}>
                      {new Date(selectedOwner.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[sharedStyles.statSubtitle, { fontSize: 12 }]}>Approved Date</Text>
                    <Text style={[sharedStyles.statLabel, { fontSize: 12 }]}>
                      {new Date(selectedOwner.approvedDate).toLocaleDateString()}
                    </Text>
                  </View>
                  {selectedOwner.reviewedBy && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[sharedStyles.statSubtitle, { fontSize: 12 }]}>Reviewed By</Text>
                      <Text style={[sharedStyles.statLabel, { fontSize: 12 }]}>
                        Barangay Official
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* Document Viewer Modal */}
      <Modal
        visible={showDocumentViewer}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowDocumentViewer(false);
          setTimeout(() => {
            setSelectedDocument(null);
          }, 200);
        }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={documentViewerStyles.container}>
            <View style={documentViewerStyles.header}>
              <Text style={documentViewerStyles.title} numberOfLines={1} ellipsizeMode="tail">
                {selectedDocument?.name || 'Document'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[documentViewerStyles.button, isDownloading && { opacity: 0.5 }]}
                  onPress={() => {
                    if (selectedDocument && !isDownloading) {
                      downloadDocument(selectedDocument);
                    }
                  }}
                  disabled={isDownloading}
                  activeOpacity={0.7}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Download size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={documentViewerStyles.button}
                  onPress={() => {
                    setShowDocumentViewer(false);
                    setTimeout(() => {
                      setSelectedDocument(null);
                    }, 200);
                  }}
                  activeOpacity={0.7}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedDocument && selectedDocument.uri && (
              <ZoomableImage
                uri={selectedDocument.uri}
                onClose={() => {
                  setTimeout(() => {
                    setShowDocumentViewer(false);
                    setSelectedDocument(null);
                  }, 100);
                }}
              />
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

// Zoomable Image Component
const ZoomableImage = ({ uri, onClose }: { uri: string; onClose: () => void }) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isClosing, setIsClosing] = useState(false);
  const isMounted = useSharedValue(true);
  
  useEffect(() => {
    isMounted.value = true;
    return () => {
      isMounted.value = false;
      try {
        cancelAnimation(scale);
        cancelAnimation(translateX);
        cancelAnimation(translateY);
      } catch (error) {
        console.log('Animation cleanup error (safe to ignore):', error);
      }
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    };
  }, []);

  const resetZoom = () => {
    if (isClosing || !isMounted.value) return;
    try {
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      scale.value = withTiming(1, { duration: 200 });
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    } catch (error) {
      console.error('Error resetting zoom:', error);
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  };

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    setTimeout(() => {
      onClose();
    }, 50);
  };

  const pinchGesture = Gesture.Pinch()
    .enabled(!isClosing)
    .onUpdate((event) => {
      if (isClosing || !isMounted.value) return;
      try {
        const newScale = Math.max(1, Math.min(savedScale.value * event.scale, 5));
        scale.value = newScale;
      } catch (error) {
        console.error('Pinch gesture error:', error);
      }
    })
    .onEnd(() => {
      if (isClosing || !isMounted.value) return;
      try {
        savedScale.value = scale.value;
        if (scale.value < 1) {
          scale.value = withTiming(1, { duration: 200 });
          savedScale.value = 1;
        }
      } catch (error) {
        console.error('Pinch gesture end error:', error);
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(!isClosing)
    .onUpdate((event) => {
      if (isClosing || !isMounted.value) return;
      try {
        if (scale.value > 1) {
          translateX.value = savedTranslateX.value + event.translationX;
          translateY.value = savedTranslateY.value + event.translationY;
        }
      } catch (error) {
        console.error('Pan gesture error:', error);
      }
    })
    .onEnd(() => {
      if (isClosing || !isMounted.value) return;
      try {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } catch (error) {
        console.error('Pan gesture end error:', error);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(!isClosing)
    .numberOfTaps(2)
    .onEnd(() => {
      if (!isClosing && isMounted.value) {
        runOnJS(handleClose)();
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => {});

  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(pinchGesture, panGesture),
    Gesture.Exclusive(tapGesture, singleTapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  if (isClosing || !uri) {
    return null;
  }

  return (
    <View style={documentViewerStyles.zoomableContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[documentViewerStyles.zoomableImageContainer, animatedStyle]}>
          <Image
            source={{ uri }}
            style={documentViewerStyles.zoomableImage}
            resizeMode="contain"
            onError={(error) => {
              console.error('Image load error:', error);
              handleClose();
            }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const documentViewerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 16,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomableContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomableImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomableImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

