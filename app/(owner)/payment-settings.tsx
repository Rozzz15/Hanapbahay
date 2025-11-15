import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Pressable, Platform, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db, generateId } from '../../utils/db';
import { useToast } from '@/components/ui/toast';
import { createNotification } from '@/utils';
import { ArrowLeft, Plus, Trash2, CreditCard, Save, ImageIcon, X } from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import * as ImagePicker from 'expo-image-picker';

interface PaymentAccount {
  id: string;
  ownerId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer' | 'cash';
  accountName: string;
  accountNumber: string;
  accountDetails: string;
  qrCodeImageUri?: string; // QR code image URI for GCash payments
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const PAYMENT_TYPES = [
  { id: 'gcash', name: 'GCash', icon: '📱', placeholder: 'Enter GCash number (e.g., 09123456789)' },
  { id: 'paymaya', name: 'Maya', icon: '💳', placeholder: 'Enter Maya number (e.g., 09123456789)' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', placeholder: 'Enter bank account number' },
  { id: 'cash', name: 'Cash Payment', icon: '💵', placeholder: 'Enter payment instructions' }
];

export default function PaymentSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [formData, setFormData] = useState({
    type: 'gcash' as PaymentAccount['type'],
    accountName: '',
    accountNumber: '',
    accountDetails: '',
    qrCodeImageUri: '' as string | undefined
  });

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('owner')) {
      showAlert('Access Denied', 'This page is for property owners only.');
      router.replace('/(tabs)');
      return;
    }

    loadPaymentAccounts();
  }, [user]);

  const loadPaymentAccounts = async () => {
    if (!user?.id) {
      console.error('❌ No user ID found for loading payment accounts');
      return;
    }

    try {
      setLoadingData(true);
      console.log('📖 Loading payment accounts for user:', user.id);
      
      const allAccounts = await db.list<PaymentAccount>('payment_accounts');
      console.log('📖 All payment accounts from DB:', allAccounts);
      
      const userAccounts = allAccounts
        .filter(account => account.ownerId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log('📖 Filtered user accounts:', userAccounts);
      setAccounts(userAccounts);
    } catch (error) {
      console.error('❌ Error loading payment accounts:', error);
      toast.show(createNotification({
        title: 'Load Failed',
        description: `Failed to load payment accounts: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        type: 'error'
      }));
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    console.log('🔄 Resetting form');
    setFormData({
      type: 'gcash',
      accountName: '',
      accountNumber: '',
      accountDetails: '',
      qrCodeImageUri: undefined
    });
    setEditingAccount(null);
    setShowAddForm(false);
  };

  const validateForm = () => {
    if (!formData.accountName.trim()) {
      toast.show(createNotification({
        title: 'Validation Error',
        description: 'Please enter the account holder name.',
        type: 'error'
      }));
      return false;
    }

    if (!formData.accountNumber.trim()) {
      toast.show(createNotification({
        title: 'Validation Error',
        description: 'Please enter the account number or email.',
        type: 'error'
      }));
      return false;
    }

    // Validate based on payment type
    if (formData.type === 'gcash' || formData.type === 'paymaya') {
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(formData.accountNumber)) {
        toast.show(createNotification({
          title: 'Invalid Format',
          description: 'Please enter a valid mobile number (e.g., 09123456789).',
          type: 'error'
        }));
        return false;
      }
    }

    if (formData.type === 'cash') {
      if (formData.accountNumber.trim().length < 5) {
        toast.show(createNotification({
          title: 'Invalid Instructions',
          description: 'Please enter detailed payment instructions (at least 5 characters).',
          type: 'error'
        }));
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    console.log('💾 handleSave called');
    console.log('👤 User ID:', user?.id);
    console.log('📝 Form Data:', formData);
    
    if (!user?.id) {
      console.error('❌ No user ID found');
      toast.show(createNotification({
        title: 'Authentication Error',
        description: 'Please log in to save payment settings.',
        type: 'error'
      }));
      return;
    }

    console.log('🔍 Validating form...');
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    console.log('✅ Form validation passed');

    try {
      setLoading(true);
      console.log('💾 Starting payment account save process...');
      console.log('📊 Current accounts count:', accounts.length);

      const now = new Date().toISOString();

      if (editingAccount) {
        // Update existing account
        console.log('📝 Updating existing account:', editingAccount.id);
        const updatedAccount: PaymentAccount = {
          ...editingAccount,
          type: formData.type,
          accountName: formData.accountName.trim(),
          accountNumber: formData.accountNumber.trim(),
          accountDetails: formData.accountDetails.trim(),
          qrCodeImageUri: formData.qrCodeImageUri || editingAccount.qrCodeImageUri,
          updatedAt: now
        };

        console.log('📝 Updated account data:', updatedAccount);
        await db.upsert('payment_accounts', editingAccount.id, updatedAccount);
        console.log('✅ Account updated successfully');
        
        toast.show(createNotification({
          title: '✅ Payment Info Updated',
          description: 'Your payment information has been updated successfully.',
          type: 'success'
        }));
      } else {
        // Create new account
        const newAccount: PaymentAccount = {
          id: generateId('pay'),
          ownerId: user.id,
          type: formData.type,
          accountName: formData.accountName.trim(),
          accountNumber: formData.accountNumber.trim(),
          accountDetails: formData.accountDetails.trim(),
          qrCodeImageUri: formData.qrCodeImageUri,
          isActive: true,
          createdAt: now,
          updatedAt: now
        };

        console.log('📝 Creating new account:', newAccount);
        await db.upsert('payment_accounts', newAccount.id, newAccount);
        console.log('✅ Account created successfully');
        
        toast.show(createNotification({
          title: '✅ Payment Info Added',
          description: 'Your payment information has been saved successfully.',
          type: 'success'
        }));
      }

      console.log('🔄 Resetting form and reloading accounts...');
      resetForm();
      await loadPaymentAccounts();
      console.log('✅ Payment account save process completed');
    } catch (error) {
      console.error('❌ Error saving payment account:', error);
      toast.show(createNotification({
        title: 'Save Failed',
        description: `Failed to save payment information: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        type: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!user?.id) return;

    showAlert(
      'Delete Payment Account',
      'Are you sure you want to delete this payment account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Verify the account belongs to the current user before deleting
              const account = await db.get<PaymentAccount>('payment_accounts', accountId);
              if (!account || account.ownerId !== user.id) {
                throw new Error('Payment account not found or access denied');
              }
              
              await db.remove('payment_accounts', accountId);
              
              toast.show(createNotification({
                title: '✅ Payment Account Deleted',
                description: 'The payment account has been removed successfully.',
                type: 'success'
              }));
              
              loadPaymentAccounts();
            } catch (error) {
              console.error('Error deleting payment account:', error);
              toast.show(createNotification({
                title: 'Delete Failed',
                description: 'Failed to delete payment account. Please try again.',
                type: 'error'
              }));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEdit = (account: PaymentAccount) => {
    setFormData({
      type: account.type,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      accountDetails: account.accountDetails,
      qrCodeImageUri: account.qrCodeImageUri
    });
    setEditingAccount(account);
    setShowAddForm(true);
  };

  const handlePickQRCode = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to upload QR code.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, qrCodeImageUri: result.assets[0].uri }));
        toast.show(createNotification({
          title: 'QR Code Added',
          description: 'QR code image has been selected.',
          type: 'success'
        }));
      }
    } catch (error) {
      console.error('Error picking QR code image:', error);
      toast.show(createNotification({
        title: 'Error',
        description: 'Failed to pick QR code image. Please try again.',
        type: 'error'
      }));
    }
  };

  const handleRemoveQRCode = () => {
    setFormData(prev => ({ ...prev, qrCodeImageUri: undefined }));
  };

  // Dedicated handler for opening the add form
  const handleOpenAddForm = useCallback(() => {
    console.log('🔥 handleOpenAddForm called');
    console.log('📊 Current state - showAddForm:', showAddForm);
    console.log('📊 Current state - editingAccount:', editingAccount);
    console.log('📊 Current state - formData:', formData);
    
    // Force state updates
    setShowAddForm(true);
    setEditingAccount(null);
    setFormData({
      type: 'gcash',
      accountName: '',
      accountNumber: '',
      accountDetails: '',
      qrCodeImageUri: undefined
    });
    
    console.log('✅ State updates dispatched - form should show');
    
    // Force a re-render after a short delay
    setTimeout(() => {
      console.log('🔄 Checking state after timeout - showAddForm:', showAddForm);
    }, 100);
  }, [showAddForm, editingAccount, formData]);

  const renderAddForm = () => {
    const selectedType = PAYMENT_TYPES.find(t => t.id === formData.type);
    
    // Check if owner already has accounts of the selected type
    const existingAccountsOfType = accounts.filter(acc => acc.type === formData.type && (!editingAccount || acc.id !== editingAccount.id));
    const hasExistingAccount = existingAccountsOfType.length > 0;
    
    return (
      <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
        <Text style={[sharedStyles.sectionTitle, { marginBottom: designTokens.spacing.lg }]}>
          {editingAccount ? 'Edit Payment Account' : 'Add New Payment Account'}
        </Text>

        <View style={sharedStyles.formGroup}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.xs }}>
            <Text style={sharedStyles.formLabel}>Payment Method *</Text>
            {hasExistingAccount && !editingAccount && (
              <View style={{
                backgroundColor: designTokens.colors.infoLight,
                paddingHorizontal: designTokens.spacing.sm,
                paddingVertical: designTokens.spacing.xs,
                borderRadius: designTokens.borderRadius.sm,
              }}>
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.info,
                  fontWeight: designTokens.typography.medium,
                }}>
                  {existingAccountsOfType.length} existing {formData.type === 'gcash' ? 'GCash' : formData.type === 'paymaya' ? 'Maya' : formData.type}
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.sm }}>
            {PAYMENT_TYPES.map((type) => {
              const existingOfThisType = accounts.filter(acc => acc.type === type.id && (!editingAccount || acc.id !== editingAccount.id));
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    sharedStyles.secondaryButton,
                    formData.type === type.id && { backgroundColor: designTokens.colors.primary, borderColor: designTokens.colors.primary }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: type.id as PaymentAccount['type'] }))}
                >
                  <Text style={[
                    sharedStyles.secondaryButtonText,
                    formData.type === type.id && { color: 'white' }
                  ]}>
                    {type.icon} {type.name}
                    {existingOfThisType.length > 0 && ` (${existingOfThisType.length})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {hasExistingAccount && !editingAccount && (
            <View style={{
              marginTop: designTokens.spacing.sm,
              padding: designTokens.spacing.sm,
              backgroundColor: designTokens.colors.infoLight,
              borderRadius: designTokens.borderRadius.md,
            }}>
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.info,
              }}>
                ℹ️ You already have {existingAccountsOfType.length} {formData.type === 'gcash' ? 'GCash' : formData.type} account{existingAccountsOfType.length > 1 ? 's' : ''}. You can add another one if needed. Tenants will be able to choose which account to use for payments.
              </Text>
            </View>
          )}
        </View>

        <View style={sharedStyles.formGroup}>
          <Text style={sharedStyles.formLabel}>Account Name *</Text>
          <TextInput
            style={sharedStyles.formInput}
            placeholder="Enter account holder name"
            value={formData.accountName}
            onChangeText={(value) => setFormData(prev => ({ ...prev, accountName: value }))}
          />
        </View>

        <View style={sharedStyles.formGroup}>
          <Text style={sharedStyles.formLabel}>
            {formData.type === 'cash' ? 'Payment Instructions *' : 'Account Number *'}
          </Text>
          <TextInput
            style={sharedStyles.formInput}
            placeholder={selectedType?.placeholder || 'Enter account number'}
            value={formData.accountNumber}
            onChangeText={(value) => setFormData(prev => ({ ...prev, accountNumber: value }))}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        <View style={sharedStyles.formGroup}>
          <Text style={sharedStyles.formLabel}>Notes (Optional)</Text>
          <TextInput
            style={[sharedStyles.formInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="e.g., Send exact amount only, Include reference number"
            value={formData.accountDetails}
            onChangeText={(value) => setFormData(prev => ({ ...prev, accountDetails: value }))}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* QR Code Upload - Only for GCash */}
        {formData.type === 'gcash' && (
          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.formLabel}>GCash QR Code (Optional)</Text>
            <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.sm, fontSize: 12 }]}>
              Upload your GCash QR code image. This will be used to generate dynamic QR codes for each rental invoice.
            </Text>
            {formData.qrCodeImageUri ? (
              <View style={{ position: 'relative', marginTop: designTokens.spacing.sm }}>
                <Image
                  source={{ uri: formData.qrCodeImageUri }}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: designTokens.spacing.sm,
                    borderWidth: 1,
                    borderColor: designTokens.colors.borderLight,
                    alignSelf: 'center'
                  }}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: 20,
                    backgroundColor: designTokens.colors.error,
                    borderRadius: 15,
                    width: 30,
                    height: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: 'white'
                  }}
                  onPress={handleRemoveQRCode}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  sharedStyles.secondaryButton,
                  {
                    paddingVertical: designTokens.spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: designTokens.spacing.sm
                  }
                ]}
                onPress={handlePickQRCode}
              >
                <ImageIcon size={18} color={designTokens.colors.primary} />
                <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.primary }]}>
                  Upload QR Code Image
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: designTokens.spacing.md }}>
          <TouchableOpacity
            style={[sharedStyles.secondaryButton, { flex: 1 }]}
            onPress={resetForm}
          >
            <Text style={sharedStyles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sharedStyles.primaryButton, { flex: 1 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Save size={16} color="white" />
            <Text style={sharedStyles.primaryButtonText}>
              {loading ? 'Saving...' : editingAccount ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Add Another Account Button - Only show when creating new account */}
        {!editingAccount && (
          <TouchableOpacity
            style={[sharedStyles.secondaryButton, { marginTop: designTokens.spacing.md }]}
            onPress={() => {
              console.log('➕ Adding another account');
              handleSave().then(() => {
                // Reset form but keep the add form open
                setFormData({
                  type: 'gcash',
                  accountName: '',
                  accountNumber: '',
                  accountDetails: '',
                  qrCodeImageUri: undefined
                });
                setEditingAccount(null);
                // Keep showAddForm as true
              });
            }}
            disabled={loading}
          >
            <Plus size={16} color={designTokens.colors.primary} />
            <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.primary }]}>
              Save & Add Another
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAccountCard = (account: PaymentAccount) => {
    const paymentType = PAYMENT_TYPES.find(t => t.id === account.type);
    
    // Count how many accounts of the same type exist (to show if there are multiple)
    const accountsOfSameType = accounts.filter(acc => acc.type === account.type);
    const hasMultipleOfSameType = accountsOfSameType.length > 1;
    const accountIndex = accountsOfSameType.findIndex(acc => acc.id === account.id) + 1;
    
    return (
      <View key={account.id} style={sharedStyles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginRight: designTokens.spacing.md }]}>
              <Text style={{ fontSize: 20 }}>{paymentType?.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: 4 }}>
                <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.lg }]}>
                  {paymentType?.name}
                </Text>
                {hasMultipleOfSameType && (
                  <View style={{
                    backgroundColor: designTokens.colors.primary + '20',
                    paddingHorizontal: designTokens.spacing.xs,
                    paddingVertical: 2,
                    borderRadius: designTokens.borderRadius.sm,
                  }}>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.primary,
                      fontWeight: designTokens.typography.semibold,
                    }}>
                      #{accountIndex}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.textPrimary }]}>
                {account.accountName}
              </Text>
              {hasMultipleOfSameType && (
                <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, color: designTokens.colors.textMuted, marginTop: 2 }]}>
                  {account.accountNumber}
                </Text>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm }}>
            <TouchableOpacity
              style={[sharedStyles.secondaryButton, { paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs }]}
              onPress={() => handleEdit(account)}
            >
              <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.info }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sharedStyles.secondaryButton, { paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs }]}
              onPress={() => handleDelete(account.id)}
            >
              <Trash2 size={14} color={designTokens.colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: designTokens.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
            <Text style={sharedStyles.statSubtitle}>
              {account.type === 'cash' ? 'Payment Instructions:' : 'Account Number:'}
            </Text>
            <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm }]}>
              {account.accountNumber}
            </Text>
          </View>
          
          {account.accountDetails && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
              <Text style={sharedStyles.statSubtitle}>Notes:</Text>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, flex: 1, textAlign: 'right' }]}>
                {account.accountDetails}
              </Text>
            </View>
          )}
          
          {account.type === 'gcash' && account.qrCodeImageUri && (
            <View style={{ marginTop: designTokens.spacing.md, alignItems: 'center' }}>
              <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.sm }]}>QR Code:</Text>
              <Image
                source={{ uri: account.qrCodeImageUri }}
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: designTokens.spacing.sm,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight
                }}
                resizeMode="contain"
              />
            </View>
          )}
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={sharedStyles.statSubtitle}>Status:</Text>
            <View style={[
              sharedStyles.statusBadge,
              { backgroundColor: account.isActive ? designTokens.colors.successLight : designTokens.colors.borderLight }
            ]}>
              <Text style={[
                sharedStyles.statusText,
                { color: account.isActive ? designTokens.colors.success : designTokens.colors.textMuted }
              ]}>
                {account.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loadingData) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading payment settings...</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <View style={sharedStyles.mainContent}>
        <ScrollView style={sharedStyles.scrollView}>
          <View style={sharedStyles.pageContainer}>
            {/* Header */}
            <View style={sharedStyles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: designTokens.spacing.md }}>
                <ArrowLeft size={24} color={designTokens.colors.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={sharedStyles.pageTitle}>Payment Settings</Text>
                <Text style={[sharedStyles.statSubtitle, { marginTop: 4 }]}>Manage your payment methods</Text>
              </View>
            </View>

            {/* Add Form */}
            {showAddForm && renderAddForm()}

            {/* Add Button - Always show when not editing */}
            {!showAddForm && (
              <View style={sharedStyles.section}>
                <Pressable
                  style={({ pressed }) => [
                    sharedStyles.primaryButton,
                    { 
                      marginBottom: designTokens.spacing.lg,
                      opacity: pressed ? 0.7 : 1,
                      cursor: Platform.OS === 'web' ? 'pointer' : undefined
                    }
                  ]}
                  onPress={handleOpenAddForm}
                  accessibilityRole="button"
                  accessibilityLabel="Add Payment Account"
                >
                  <Plus size={16} color="white" />
                  <Text style={sharedStyles.primaryButtonText}>Add Payment Account</Text>
                </Pressable>
              </View>
            )}

            {/* Payment Accounts */}
            <View style={sharedStyles.section}>
              {accounts.length === 0 ? (
                <View style={sharedStyles.emptyState}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginBottom: designTokens.spacing.lg }]}>
                    <CreditCard size={32} color="#3B82F6" />
                  </View>
                  <Text style={sharedStyles.emptyStateTitle}>No payment accounts</Text>
                  <Text style={sharedStyles.emptyStateText}>
                    Add your payment methods to receive payments from tenants
                  </Text>
                </View>
              ) : (
                <View style={sharedStyles.list}>
                  {accounts.map(renderAccountCard)}
                </View>
              )}
            </View>

            {/* Info Box */}
            <View style={[sharedStyles.card, { backgroundColor: designTokens.colors.infoLight }]}>
              <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.info }]}>
                <Text style={{ fontWeight: designTokens.typography.semibold }}>Note:</Text> These payment details will be automatically shared with tenants when their booking requests are approved. Make sure all information is accurate and up-to-date.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}