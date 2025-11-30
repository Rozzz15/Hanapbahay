import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Pressable, Platform, Image, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db, generateId } from '../../utils/db';
import { 
  ArrowLeft, 
  Plus, 
  CreditCard, 
  Save, 
  ImageIcon, 
  X, 
  Wallet,
  Smartphone,
  Building2,
  Banknote,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { parseQRPHCode } from '../../utils/qr-code-generator';

interface PaymentAccount {
  id: string;
  ownerId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer' | 'cash';
  accountName: string;
  accountNumber: string;
  accountDetails: string;
  qrCodeImageUri?: string; // QR code image URI for GCash payments
  qrCodeData?: string; // Parsed QR-PH code data string for accurate dynamic QR generation
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const PAYMENT_TYPES = [
  { id: 'gcash', name: 'GCash', icon: require('../../assets/images/Gcash.jpg'), placeholder: 'Enter GCash number (e.g., 09123456789)' },
  { id: 'paymaya', name: 'Maya', icon: require('../../assets/images/paymaya.jpg'), placeholder: 'Enter Maya number (e.g., 09123456789)' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', placeholder: 'Enter bank account number' },
  { id: 'cash', name: 'Cash Payment', icon: '💵', placeholder: 'Enter payment instructions' }
];

export default function PaymentSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    type: 'gcash' as PaymentAccount['type'],
    accountName: '',
    accountNumber: '',
    accountDetails: '',
    qrCodeImageUri: '' as string | undefined,
    qrCodeData: '' as string | undefined
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
      Alert.alert(
        'Load Failed',
        `Failed to load payment accounts: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentAccounts();
  };

  const getPaymentStats = () => {
    const total = accounts.length;
    const gcash = accounts.filter(a => a.type === 'gcash').length;
    const paymaya = accounts.filter(a => a.type === 'paymaya').length;
    const bank = accounts.filter(a => a.type === 'bank_transfer').length;
    const cash = accounts.filter(a => a.type === 'cash').length;
    const active = accounts.filter(a => a.isActive).length;
    
    return { total, gcash, paymaya, bank, cash, active };
  };

  const resetForm = () => {
    console.log('🔄 Resetting form');
    setFormData({
      type: 'gcash',
      accountName: '',
      accountNumber: '',
      accountDetails: '',
      qrCodeImageUri: undefined,
      qrCodeData: undefined
    });
    setEditingAccount(null);
    setShowAddForm(false);
  };

  const validateForm = () => {
    if (!formData.accountName.trim()) {
      Alert.alert('Validation Error', 'Please enter the account holder name.');
      return false;
    }

    if (!formData.accountNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter the account number or email.');
      return false;
    }

    // Validate based on payment type
    if (formData.type === 'gcash' || formData.type === 'paymaya') {
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(formData.accountNumber)) {
        Alert.alert('Invalid Format', 'Please enter a valid mobile number (e.g., 09123456789).');
        return false;
      }
    }

    if (formData.type === 'cash') {
      if (formData.accountNumber.trim().length < 5) {
        Alert.alert('Invalid Instructions', 'Please enter detailed payment instructions (at least 5 characters).');
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
      Alert.alert('Authentication Error', 'Please log in to save payment settings.');
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
          qrCodeData: formData.qrCodeData || editingAccount.qrCodeData,
          updatedAt: now
        };

        console.log('📝 Updated account data:', updatedAccount);
        await db.upsert('payment_accounts', editingAccount.id, updatedAccount);
        console.log('✅ Account updated successfully');
        
        Alert.alert('✅ Payment Info Updated', 'Your payment information has been updated successfully.');
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
          qrCodeData: formData.qrCodeData,
          isActive: true,
          createdAt: now,
          updatedAt: now
        };

        console.log('📝 Creating new account:', newAccount);
        await db.upsert('payment_accounts', newAccount.id, newAccount);
        console.log('✅ Account created successfully');
        
        Alert.alert('✅ Payment Info Added', 'Your payment information has been saved successfully.');
      }

      console.log('🔄 Resetting form and reloading accounts...');
      resetForm();
      await loadPaymentAccounts();
      console.log('✅ Payment account save process completed');
    } catch (error) {
      console.error('❌ Error saving payment account:', error);
      Alert.alert(
        'Save Failed',
        `Failed to save payment information: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
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
              
              Alert.alert('✅ Payment Account Deleted', 'The payment account has been removed successfully.');
              
              loadPaymentAccounts();
            } catch (error) {
              console.error('Error deleting payment account:', error);
              Alert.alert('Delete Failed', 'Failed to delete payment account. Please try again.');
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
      qrCodeImageUri: account.qrCodeImageUri,
      qrCodeData: account.qrCodeData
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

      // Launch image picker with cropping enabled to capture only the QR code
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for QR codes
        quality: 1.0, // Higher quality for better QR code recognition
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setFormData(prev => ({ ...prev, qrCodeImageUri: imageUri }));
        
        // Automatically decode QR code from image and extract account info
        try {
          const { decodeQRCodeFromImage, parseQRPHCode } = await import('../../utils/qr-code-generator');
          
          // Show loading indicator
          Alert.alert('Processing...', 'Decoding QR code from image...', [{ text: 'OK' }]);
          
          // Decode QR code from image
          const qrData = await decodeQRCodeFromImage(imageUri);
          
          if (qrData) {
            // Parse the QR-PH code
            const parsed = parseQRPHCode(qrData);
            
            if (parsed && parsed.isValid) {
              // Validate GUID matches account type
              const expectedGUID = formData.type === 'gcash' ? '01' : '02';
              
              if (parsed.guid !== expectedGUID) {
                Alert.alert(
                  'QR Code Mismatch',
                  `This QR code is for ${parsed.guid === '01' ? 'GCash' : 'PayMaya'}, but your account type is set to ${formData.type === 'gcash' ? 'GCash' : 'PayMaya'}. Please change the account type or use the correct QR code.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Change Account Type',
                      onPress: () => {
                        setFormData(prev => ({
                          ...prev,
                          type: parsed.guid === '01' ? 'gcash' : 'paymaya'
                        }));
                        // Retry auto-fill after type change
                        setTimeout(() => {
                          handleAutoFillFromQRCode(qrData, parsed);
                        }, 100);
                      }
                    }
                  ]
                );
              } else {
                // Auto-fill account information
                handleAutoFillFromQRCode(qrData, parsed);
              }
            } else {
              // Show more detailed error message
              console.log('❌ QR code parsing failed. Raw QR data (first 200 chars):', qrData.substring(0, 200));
              Alert.alert(
                'Invalid QR Code',
                `The QR code could not be parsed as QR-PH format. This might be because:\n\n• The QR code is not in EMV QR-PH format\n• The QR code data is incomplete\n• The QR code is corrupted\n\nYou can still manually enter the account information, or try scanning the QR code again.\n\nQR data preview: ${qrData.substring(0, 50)}...`,
                [{ text: 'OK' }]
              );
            }
          } else {
            Alert.alert(
              'QR Code Decoding Failed',
              'Could not automatically decode the QR code. Please try uploading the image again or manually enter the account information.',
              [{ text: 'OK' }]
            );
          }
        } catch (error) {
          console.error('Error decoding QR code:', error);
          Alert.alert(
            'Error',
            'Failed to decode QR code. Please try uploading the image again or manually enter the account information.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error picking QR code image:', error);
      Alert.alert('Error', 'Failed to pick QR code image. Please try again.');
    }
  };

  const handleRemoveQRCode = () => {
    setFormData(prev => ({ ...prev, qrCodeImageUri: undefined, qrCodeData: undefined }));
  };

  const handleAutoFillFromQRCode = (qrData: string, parsed: any) => {
    // Store QR code data without auto-filling account information
    // This allows the user to keep their manually entered account details
    // while using the QR code structure for accurate dynamic QR generation
    setFormData(prev => ({
      ...prev,
      qrCodeData: qrData // Store the QR code data for accurate dynamic QR generation
    }));

    Alert.alert(
      'QR Code Data Stored',
      'The QR code data has been successfully stored and will be used to generate accurate dynamic QR codes. Your manually entered account information will be preserved.'
    );
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
      qrCodeImageUri: undefined,
      qrCodeData: undefined
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
                  fontWeight: '500' as const,
                }}>
                  {existingAccountsOfType.length} existing {formData.type === 'gcash' ? 'GCash' : formData.type === 'paymaya' ? 'Maya' : formData.type}
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.sm }}>
            {PAYMENT_TYPES.map((type) => {
              const existingOfThisType = accounts.filter(acc => acc.type === type.id && (!editingAccount || acc.id !== editingAccount.id));
              const isImage = typeof type.icon !== 'string';
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    sharedStyles.secondaryButton,
                    formData.type === type.id && { backgroundColor: designTokens.colors.primary, borderColor: designTokens.colors.primary }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: type.id as PaymentAccount['type'] }))}
                >
                  {isImage ? (
                    <Image 
                      source={type.icon} 
                      style={{ 
                        width: 18, 
                        height: 18, 
                        marginRight: designTokens.spacing.xs,
                        resizeMode: 'contain',
                        borderRadius: 4
                      }} 
                    />
                  ) : (
                    <Text style={[
                      sharedStyles.secondaryButtonText,
                      formData.type === type.id && { color: 'white' }
                    ]}>
                      {type.icon}
                    </Text>
                  )}
                  <Text style={[
                    sharedStyles.secondaryButtonText,
                    formData.type === type.id && { color: 'white' }
                  ]}>
                    {type.name}
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
          <Text style={sharedStyles.formLabel}>
            {formData.type === 'cash' ? 'Payment Method Name *' : 'Account Name *'}
          </Text>
          {formData.type === 'cash' && (
            <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.xs, fontSize: 12, color: designTokens.colors.textMuted }]}>
              Give this payment method a name (e.g., &quot;Property Office&quot;, &quot;Main Entrance&quot;, &quot;Owner - Juan dela Cruz&quot;)
            </Text>
          )}
          <TextInput
            style={sharedStyles.formInput}
            placeholder={
              formData.type === 'cash'
                ? 'e.g., Property Office, Main Entrance, Owner Name'
                : formData.type === 'gcash' || formData.type === 'paymaya'
                ? 'e.g., Juan dela Cruz'
                : 'e.g., Juan dela Cruz'
            }
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

        {/* QR Code Upload - For GCash and Maya */}
        {(formData.type === 'gcash' || formData.type === 'paymaya') && (
          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.formLabel}>
              {formData.type === 'gcash' ? 'GCash' : 'Maya'} QR Code (Optional)
            </Text>
            <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.sm, fontSize: 12 }]}>
              Upload your {formData.type === 'gcash' ? 'GCash' : 'Maya'} QR code image.{'\n'}
              <Text style={{ fontWeight: '600', color: designTokens.colors.primary }}>Important:</Text> When selecting the image, <Text style={{ fontWeight: '600' }}>crop it to show only the QR code</Text> (not the entire screen or background). This ensures accurate decoding and dynamic QR code generation.
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
                  qrCodeImageUri: undefined,
                  qrCodeData: undefined
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
    
    // Get icon based on type
    const getTypeIcon = () => {
      switch (account.type) {
        case 'gcash':
          return (
            <Image 
              source={require('../../assets/images/Gcash.jpg')} 
              style={{ 
                width: 36, 
                height: 36,
                borderRadius: 18
              }} 
              resizeMode="cover"
            />
          );
        case 'paymaya':
          return (
            <Image 
              source={require('../../assets/images/paymaya.jpg')} 
              style={{ 
                width: 36, 
                height: 36,
                borderRadius: 18
              }} 
              resizeMode="cover"
            />
          );
        case 'bank_transfer':
          return <Building2 size={20} color={designTokens.colors.primary} />;
        case 'cash':
          return <Banknote size={20} color={designTokens.colors.warning} />;
        default:
          return <CreditCard size={20} color={designTokens.colors.primary} />;
      }
    };

    const getTypeIconBg = () => {
      switch (account.type) {
        case 'gcash':
          return iconBackgrounds.blue;
        case 'paymaya':
          return iconBackgrounds.teal;
        case 'bank_transfer':
          return iconBackgrounds.green;
        case 'cash':
          return iconBackgrounds.orange;
        default:
          return iconBackgrounds.blue;
      }
    };
    
    return (
      <Pressable
        key={account.id}
        style={({ pressed }) => [
          sharedStyles.card,
          pressed && { opacity: 0.7 }
        ]}
        onLongPress={() => handleDelete(account.id)}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[sharedStyles.statIcon, getTypeIconBg(), { marginRight: designTokens.spacing.md }]}>
              {getTypeIcon()}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: designTokens.spacing.xs, flexWrap: 'wrap' }}>
                <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: 0 }]}>
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
                      fontWeight: '600' as const,
                    }}>
                      #{accountIndex}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[sharedStyles.statLabel, { color: designTokens.colors.textPrimary, fontWeight: '500' as const, marginBottom: designTokens.spacing.xs }]}>
                {account.accountName}
              </Text>
              {hasMultipleOfSameType && (
                <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, color: designTokens.colors.textMuted }]}>
                  {account.accountNumber}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[sharedStyles.secondaryButton, { paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs, flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.xs }]}
            onPress={() => handleEdit(account)}
          >
            <Edit size={14} color={designTokens.colors.info} />
            <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.info }]}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Details Section */}
        <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: designTokens.spacing.lg }}>
          {account.type === 'cash' ? (
            <View style={{ marginBottom: designTokens.spacing.md }}>
              <Text style={[sharedStyles.formLabel, { marginBottom: designTokens.spacing.xs }]}>
                Payment Instructions:
              </Text>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, lineHeight: 20 }]}>
                {account.accountNumber}
              </Text>
            </View>
          ) : (
            <View style={{ marginBottom: designTokens.spacing.md }}>
              <Text style={[sharedStyles.formLabel, { marginBottom: designTokens.spacing.xs }]}>
                Account Number:
              </Text>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, fontWeight: '600' as const }]}>
                {account.accountNumber}
              </Text>
            </View>
          )}
          
          {account.accountDetails && (
            <View style={{ marginBottom: designTokens.spacing.md }}>
              <Text style={[sharedStyles.formLabel, { marginBottom: designTokens.spacing.xs }]}>Notes:</Text>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, lineHeight: 20 }]}>
                {account.accountDetails}
              </Text>
            </View>
          )}
          
          {(account.type === 'gcash' || account.type === 'paymaya') && account.qrCodeImageUri && (
            <View style={{ marginBottom: designTokens.spacing.md, alignItems: 'center', padding: designTokens.spacing.md, backgroundColor: designTokens.colors.background, borderRadius: designTokens.borderRadius.md }}>
              <Text style={[sharedStyles.formLabel, { marginBottom: designTokens.spacing.sm }]}>
                {account.type === 'gcash' ? 'GCash' : 'Maya'} QR Code:
              </Text>
              <Image
                source={{ uri: account.qrCodeImageUri }}
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: designTokens.borderRadius.md,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight
                }}
                resizeMode="contain"
              />
            </View>
          )}
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: designTokens.spacing.sm }}>
            <Text style={[sharedStyles.formLabel, { marginBottom: 0 }]}>Status:</Text>
            <View style={[
              sharedStyles.statusBadge,
              { 
                backgroundColor: account.isActive ? designTokens.colors.successLight : designTokens.colors.borderLight,
                paddingHorizontal: designTokens.spacing.md,
                paddingVertical: designTokens.spacing.xs,
                flexDirection: 'row',
                alignItems: 'center',
                gap: designTokens.spacing.xs,
              }
            ]}>
              {account.isActive ? (
                <CheckCircle size={14} color={designTokens.colors.success} />
              ) : (
                <XCircle size={14} color={designTokens.colors.textMuted} />
              )}
              <Text style={[
                sharedStyles.statusText,
                { 
                  color: account.isActive ? designTokens.colors.success : designTokens.colors.textMuted,
                }
              ]}>
                {account.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ marginTop: designTokens.spacing.sm, paddingTop: designTokens.spacing.sm, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
          <Text style={[sharedStyles.statSubtitle, { fontSize: 11, color: designTokens.colors.textMuted, fontStyle: 'italic', textAlign: 'center' }]}>
            💡 Tap and hold to delete
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loadingData) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading payment settings...</Text>
      </View>
    );
  }

  const stats = getPaymentStats();

  return (
    <View style={sharedStyles.container}>
      <View style={sharedStyles.mainContent}>
        <ScrollView 
          style={sharedStyles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={sharedStyles.pageContainer}>
            {/* Header */}
            <View style={sharedStyles.pageHeader}>
              <View style={sharedStyles.headerLeft}>
                <Text style={sharedStyles.pageTitle}>Payment Settings</Text>
                <Text style={sharedStyles.pageSubtitle}>
                  {stats.total} payment method{stats.total !== 1 ? 's' : ''} configured
                </Text>
              </View>
            </View>

            {/* Add Form */}
            {showAddForm && renderAddForm()}

            {/* Add Button - Always show when not editing */}
            {!showAddForm && (
              <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
                <Pressable
                  onPress={handleOpenAddForm}
                  accessibilityRole="button"
                  accessibilityLabel="Add Payment Account"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                    cursor: Platform.OS === 'web' ? 'pointer' : undefined
                  })}
                >
                  <View style={[
                    sharedStyles.card,
                    {
                      backgroundColor: designTokens.colors.white,
                      borderWidth: 2,
                      borderColor: designTokens.colors.primary,
                      borderStyle: 'dashed',
                      padding: designTokens.spacing.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: designTokens.spacing.md,
                    }
                  ]}>
                    <LinearGradient
                      colors={designTokens.gradients.primary as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        ...designTokens.shadows.sm,
                      }}
                    >
                      <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        sharedStyles.sectionTitle,
                        {
                          fontSize: designTokens.typography.base,
                          marginBottom: 2,
                          color: designTokens.colors.textPrimary,
                        }
                      ]}>
                        Add Payment Account
                      </Text>
                      <Text style={[
                        sharedStyles.statSubtitle,
                        {
                          fontSize: designTokens.typography.xs,
                          color: designTokens.colors.textSecondary,
                        }
                      ]}>
                        Add GCash, Maya, Bank Transfer, or Cash
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Payment Accounts */}
            <View style={sharedStyles.section}>
              {accounts.length === 0 ? (
                <View style={sharedStyles.emptyState}>
                  <View style={[sharedStyles.statIconLarge, iconBackgrounds.blue, { marginBottom: designTokens.spacing.lg }]}>
                    <Wallet size={32} color={designTokens.colors.primary} />
                  </View>
                  <Text style={sharedStyles.emptyStateTitle}>No Payment Methods</Text>
                  <Text style={sharedStyles.emptyStateText}>
                    Add your payment methods to receive payments from tenants. You can add multiple accounts for each payment type.
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
                <Text style={{ fontWeight: '600' as const }}>Note:</Text> These payment details will be automatically shared with tenants when their booking requests are approved. Make sure all information is accurate and up-to-date.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}