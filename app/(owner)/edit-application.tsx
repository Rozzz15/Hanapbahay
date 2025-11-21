import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Image, ActivityIndicator, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../utils/db';
import { OwnerApplicationRecord, OwnerApplicationDocument, DbUserRecord } from '../../types';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';
import * as ImagePicker from 'expo-image-picker';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Home, 
  FileText, 
  X, 
  Plus,
  Upload,
  Edit,
  ChevronRight
} from 'lucide-react-native';

export default function EditApplication() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<OwnerApplicationRecord | null>(null);
  const [userRecord, setUserRecord] = useState<DbUserRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    houseNumber: '',
    street: '',
    barangay: '' as 'RIZAL' | 'TALOLONG' | 'GOMEZ' | 'MAGSAYSAY' | 'BURGOS' | '',
  });
  const [documents, setDocuments] = useState<OwnerApplicationDocument[]>([]);
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);
  const [selectedDocumentForType, setSelectedDocumentForType] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const barangays = ['RIZAL', 'TALOLONG', 'GOMEZ', 'MAGSAYSAY', 'BURGOS'];
  
  // Predefined document types for business requirements (same as sign up)
  const documentTypes = [
    'Government ID',
    'Business Permit',
    'Barangay Clearance',
    'Mayor\'s Permit',
    'Tax Identification Number (TIN)',
    'Business Registration',
    'Other'
  ];

  useEffect(() => {
    loadApplication();
  }, [user?.id]);

  const loadApplication = async () => {
    if (!user?.id) {
      router.back();
      return;
    }

    try {
      setLoading(true);
      
      // Get user record
      const userData = await db.get<DbUserRecord>('users', user.id);
      if (!userData) {
        Alert.alert('Error', 'User not found');
        router.back();
        return;
      }
      setUserRecord(userData);

      // Get owner application
      const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
      const app = allApplications.find(a => a.userId === user.id);
      
      if (!app) {
        Alert.alert('Error', 'Application not found');
        router.back();
        return;
      }

      // Check if reapplication is requested or if status is pending
      // Allow editing if reapplication is requested OR if status is pending (for initial applications)
      if (!app.reapplicationRequested && app.status !== 'pending') {
        Alert.alert('Info', 'Your application is not eligible for editing. Please wait for barangay review or request for reapplication.');
        router.back();
        return;
      }

      setApplication(app);
      setFormData({
        name: app.name,
        email: app.email,
        contactNumber: app.contactNumber,
        houseNumber: app.houseNumber,
        street: app.street,
        barangay: app.barangay as any,
      });
      setDocuments(app.documents || []);
    } catch (error) {
      console.error('Error loading application:', error);
      Alert.alert('Error', 'Failed to load application');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    }
    if (!formData.houseNumber.trim()) {
      newErrors.houseNumber = 'House number is required';
    }
    if (!formData.street.trim()) {
      newErrors.street = 'Street is required';
    }
    if (!formData.barangay) {
      newErrors.barangay = 'Barangay is required';
    }
    if (documents.length === 0) {
      newErrors.documents = 'At least one document is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openDocumentTypeModal = (documentIndex?: number) => {
    setSelectedDocumentForType(documentIndex !== undefined ? documentIndex : null);
    setShowDocumentTypeModal(true);
  };

  const pickDocument = async (documentType: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newDoc: OwnerApplicationDocument = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: documentType, // name is used for document type
          uri: asset.uri,
          uploadedAt: new Date().toISOString(),
        };

        // If editing existing document, replace it; otherwise add new
        if (selectedDocumentForType !== null && selectedDocumentForType >= 0) {
          const updatedDocs = [...documents];
          updatedDocs[selectedDocumentForType] = newDoc;
          setDocuments(updatedDocs);
        } else {
          setDocuments([...documents, newDoc]);
        }
      }
      setShowDocumentTypeModal(false);
      setSelectedDocumentForType(null);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const changeDocumentType = (index: number) => {
    openDocumentTypeModal(index);
  };

  const handleSave = async () => {
    if (!validateForm() || !application || !user?.id) {
      return;
    }

    try {
      setSaving(true);

      // Update user record with new info
      if (userRecord) {
        const updatedUser = {
          ...userRecord,
          name: formData.name,
          email: formData.email,
          phone: formData.contactNumber,
        };
        await db.upsert('users', user.id, updatedUser);
      }

      // Update application
      const updatedApplication: OwnerApplicationRecord = {
        ...application,
        name: formData.name,
        email: formData.email,
        contactNumber: formData.contactNumber,
        houseNumber: formData.houseNumber,
        street: formData.street,
        barangay: formData.barangay,
        documents: documents,
        status: 'pending', // Reset to pending for review
        reapplicationRequested: false, // Clear reapplication flag
        reviewedBy: undefined,
        reviewedAt: undefined,
        reason: undefined,
        // Keep original createdAt, don't change it
      };

      await db.upsert('owner_applications', application.id, updatedApplication);

      if (Platform.OS === 'web') {
        window.alert('Success\n\nYour application has been updated and resubmitted for review.');
      } else {
        Alert.alert('Success', 'Your application has been updated and resubmitted for review.');
      }

      router.back();
    } catch (error) {
      console.error('Error saving application:', error);
      Alert.alert('Error', 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
        <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <ActivityIndicator size="large" color={designTokens.colors.primary} />
          <Text style={[sharedStyles.statSubtitle, { marginTop: 16 }]}>Loading application...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={true}
        >
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={sharedStyles.pageHeader}>
            <TouchableOpacity 
              style={sharedStyles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color={designTokens.colors.primary} />
            </TouchableOpacity>
            <View style={sharedStyles.headerLeft}>
              <Text style={sharedStyles.pageTitle}>Edit Application</Text>
              <Text style={sharedStyles.pageSubtitle}>
                Update your credentials and resubmit
              </Text>
            </View>
          </View>

          {/* Info Banner */}
          <View style={{
            backgroundColor: '#FEF3C7',
            borderColor: '#F59E0B',
            borderWidth: 1,
            borderRadius: 8,
            padding: 16,
            marginBottom: 24
          }}>
            <Text style={{
              fontSize: 14,
              color: '#92400E',
              lineHeight: 20
            }}>
              Your barangay has requested you to update your application. Please review and update your information, then resubmit for review.
            </Text>
          </View>

          {/* Personal Information */}
          <View style={sharedStyles.card}>
            <Text style={sharedStyles.sectionTitle}>Personal Information</Text>
            <View style={{ gap: 16, marginTop: 16 }}>
              <View>
                <Text style={[sharedStyles.statLabel, { marginBottom: 8 }]}>Full Name *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <User size={18} color="#6B7280" />
                  <TextInput
                    style={[sharedStyles.formInput || {
                      borderWidth: 1,
                      borderColor: errors.name ? '#EF4444' : '#D1D5DB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      flex: 1
                    }]}
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                  />
                </View>
                {errors.name && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.name}</Text>}
              </View>

              <View>
                <Text style={[sharedStyles.statLabel, { marginBottom: 8 }]}>Email *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Mail size={18} color="#6B7280" />
                  <TextInput
                    style={[sharedStyles.formInput || {
                      borderWidth: 1,
                      borderColor: errors.email ? '#EF4444' : '#D1D5DB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      flex: 1
                    }]}
                    placeholder="Enter your email"
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email: text });
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {errors.email && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.email}</Text>}
              </View>

              <View>
                <Text style={[sharedStyles.statLabel, { marginBottom: 8 }]}>Contact Number *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Phone size={18} color="#6B7280" />
                  <TextInput
                    style={[sharedStyles.formInput || {
                      borderWidth: 1,
                      borderColor: errors.contactNumber ? '#EF4444' : '#D1D5DB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      flex: 1
                    }]}
                    placeholder="Enter your contact number"
                    value={formData.contactNumber}
                    onChangeText={(text) => {
                      setFormData({ ...formData, contactNumber: text });
                      if (errors.contactNumber) setErrors({ ...errors, contactNumber: '' });
                    }}
                    keyboardType="phone-pad"
                  />
                </View>
                {errors.contactNumber && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.contactNumber}</Text>}
              </View>
            </View>
          </View>

          {/* Address Information */}
          <View style={[sharedStyles.card, { marginTop: 16 }]}>
            <Text style={sharedStyles.sectionTitle}>Address Information</Text>
            <View style={{ gap: 16, marginTop: 16 }}>
              <View>
                <Text style={[sharedStyles.statLabel, { marginBottom: 8 }]}>House Number *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Home size={18} color="#6B7280" />
                  <TextInput
                    style={[sharedStyles.formInput || {
                      borderWidth: 1,
                      borderColor: errors.houseNumber ? '#EF4444' : '#D1D5DB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      flex: 1
                    }]}
                    placeholder="Enter house number"
                    value={formData.houseNumber}
                    onChangeText={(text) => {
                      setFormData({ ...formData, houseNumber: text });
                      if (errors.houseNumber) setErrors({ ...errors, houseNumber: '' });
                    }}
                  />
                </View>
                {errors.houseNumber && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.houseNumber}</Text>}
              </View>

              <View>
                <Text style={[sharedStyles.statLabel, { marginBottom: 8 }]}>Street *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MapPin size={18} color="#6B7280" />
                  <TextInput
                    style={[sharedStyles.formInput || {
                      borderWidth: 1,
                      borderColor: errors.street ? '#EF4444' : '#D1D5DB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      flex: 1
                    }]}
                    placeholder="Enter street name"
                    value={formData.street}
                    onChangeText={(text) => {
                      setFormData({ ...formData, street: text });
                      if (errors.street) setErrors({ ...errors, street: '' });
                    }}
                  />
                </View>
                {errors.street && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.street}</Text>}
              </View>

              <View>
                <Text style={[sharedStyles.statLabel, { marginBottom: 8 }]}>Barangay *</Text>
                <TouchableOpacity
                  style={[sharedStyles.formInput || {
                    borderWidth: 1,
                    borderColor: errors.barangay ? '#EF4444' : '#D1D5DB',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    color: '#111827',
                    flex: 1
                  }, { 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between'
                  }]}
                  onPress={() => setShowBarangayDropdown(!showBarangayDropdown)}
                >
                  <Text style={{ 
                    color: formData.barangay ? '#111827' : '#9CA3AF',
                    fontSize: 16
                  }}>
                    {formData.barangay || 'Select barangay'}
                  </Text>
                  <Text style={{ fontSize: 16, color: '#6B7280' }}>▼</Text>
                </TouchableOpacity>
                {showBarangayDropdown && (
                  <View style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    marginTop: 4,
                    maxHeight: 200
                  }}>
                    {barangays.map((brgy) => (
                      <TouchableOpacity
                        key={brgy}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: '#F3F4F6'
                        }}
                        onPress={() => {
                          setFormData({ ...formData, barangay: brgy });
                          setShowBarangayDropdown(false);
                          if (errors.barangay) setErrors({ ...errors, barangay: '' });
                        }}
                      >
                        <Text style={{ 
                          color: formData.barangay === brgy ? designTokens.colors.primary : '#111827',
                          fontWeight: formData.barangay === brgy ? '600' : '400'
                        }}>
                          {brgy}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {errors.barangay && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.barangay}</Text>}
              </View>
            </View>
          </View>

          {/* Documents */}
          <View style={[sharedStyles.card, { marginTop: 16 }]}>
            <Text style={sharedStyles.sectionTitle}>Required Documents *</Text>
            <Text style={[sharedStyles.statSubtitle, { marginTop: 8, marginBottom: 16 }]}>
              Upload documents required to run a business in your Barangay. You can upload multiple documents for each type (e.g., Government ID, Business Permit, Barangay Clearance, etc.)
            </Text>

            {documents.map((doc, index) => {
              const uploadedCount = documents.filter(d => d.name === doc.name).length;
              return (
                <View key={doc.id || index} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: '#F9FAFB',
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: '#E5E7EB'
                }}>
                  <FileText size={20} color="#3B82F6" />
                  <View style={{ flex: 1 }}>
                    <Text style={[sharedStyles.statLabel, { fontSize: 14, marginBottom: 2 }]} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    {doc.uploadedAt && (
                      <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => changeDocumentType(index)}
                    style={{
                      padding: 4,
                      marginRight: 4
                    }}
                  >
                    <Edit size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeDocument(index)}
                    style={{
                      padding: 4
                    }}
                  >
                    <X size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity
              style={[sharedStyles.primaryButton, { 
                backgroundColor: '#3B82F6',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8
              }]}
              onPress={() => openDocumentTypeModal()}
            >
              <Upload size={18} color="white" />
              <Text style={sharedStyles.primaryButtonText}>Upload Document</Text>
            </TouchableOpacity>
            {errors.documents && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>{errors.documents}</Text>}
          </View>

          {/* Document Type Selection Modal */}
          <Modal
            visible={showDocumentTypeModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowDocumentTypeModal(false);
              setSelectedDocumentForType(null);
            }}
          >
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'flex-end'
            }}>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                maxHeight: '80%'
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20
                }}>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#111827'
                  }}>
                    {selectedDocumentForType !== null ? 'Change Document Type' : 'Select Document Type'}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowDocumentTypeModal(false);
                      setSelectedDocumentForType(null);
                    }}
                    style={{
                      padding: 4
                    }}
                  >
                    <X size={24} color="#6B7280" />
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 400 }}>
                  {documentTypes.map((docType) => {
                    const uploadedCount = documents.filter(doc => doc.name === docType).length;
                    const isEditing = selectedDocumentForType !== null;
                    return (
                      <Pressable
                        key={docType}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 16,
                          backgroundColor: '#F9FAFB',
                          borderRadius: 8,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: '#E5E7EB'
                        }}
                        onPress={() => pickDocument(docType)}
                      >
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: '#111827',
                            marginRight: 8
                          }}>
                            {docType}
                          </Text>
                          {uploadedCount > 0 && !isEditing && (
                            <View style={{
                              backgroundColor: '#3B82F6',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 2
                            }}>
                              <Text style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: '#FFFFFF'
                              }}>
                                {uploadedCount} {uploadedCount === 1 ? 'file' : 'files'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <ChevronRight size={20} color="#6B7280" />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Save Button */}
          <TouchableOpacity
            style={[sharedStyles.primaryButton, { 
              backgroundColor: '#10B981',
              marginTop: 32,
              marginBottom: 32,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: saving ? 0.5 : 1
            }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Save size={18} color="white" />
            )}
            <Text style={sharedStyles.primaryButtonText}>
              {saving ? 'Saving...' : 'Save & Resubmit Application'}
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
