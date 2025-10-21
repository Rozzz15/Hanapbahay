import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db, generateId } from '../../utils/db';
import { useToast } from '@/components/ui/toast';
import { createNotification } from '@/utils';
import { ArrowLeft, Plus, Trash2, CreditCard, Save } from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';

interface PaymentAccount {
  id: string;
  ownerId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer' | 'cash';
  accountName: string;
  accountNumber: string;
  accountDetails: string;
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
    accountDetails: ''
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
      accountDetails: ''
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
      accountDetails: account.accountDetails
    });
    setEditingAccount(account);
    setShowAddForm(true);
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
      accountDetails: ''
    });
    
    console.log('✅ State updates dispatched - form should show');
    
    // Force a re-render after a short delay
    setTimeout(() => {
      console.log('🔄 Checking state after timeout - showAddForm:', showAddForm);
    }, 100);
  }, [showAddForm, editingAccount, formData]);

  const renderAddForm = () => {
    const selectedType = PAYMENT_TYPES.find(t => t.id === formData.type);
    
    return (
      <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
        <Text style={[sharedStyles.sectionTitle, { marginBottom: designTokens.spacing.lg }]}>
          {editingAccount ? 'Edit Payment Account' : 'Add New Payment Account'}
        </Text>

        <View style={sharedStyles.formGroup}>
          <Text style={sharedStyles.formLabel}>Payment Method *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.sm }}>
            {PAYMENT_TYPES.map((type) => (
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
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
                  accountDetails: ''
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
    
    return (
      <View key={account.id} style={sharedStyles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginRight: designTokens.spacing.md }]}>
              <Text style={{ fontSize: 20 }}>{paymentType?.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sharedStyles.statLabel, { marginBottom: 4, fontSize: designTokens.typography.lg }]}>
                {paymentType?.name}
              </Text>
              <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.textPrimary }]}>
                {account.accountName}
              </Text>
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