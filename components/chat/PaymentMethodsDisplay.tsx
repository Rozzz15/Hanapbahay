import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';

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

interface PaymentMethodsDisplayProps {
  ownerId: string;
  tenantId: string;
  isCurrentUserOwner: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

const PAYMENT_TYPES = [
  { id: 'gcash', name: 'GCash', icon: '📱', iconImage: require('../../assets/images/Gcash.jpg'), color: '#00A86B' },
  { id: 'paymaya', name: 'Maya', icon: '💳', iconImage: require('../../assets/images/paymaya.jpg'), color: '#00A86B' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', color: '#1E40AF' },
  { id: 'cash', name: 'Cash Payment', icon: '💵', color: '#059669' }
];

export default function PaymentMethodsDisplay({ ownerId, tenantId, isCurrentUserOwner, onVisibilityChange }: PaymentMethodsDisplayProps) {
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasApprovedBooking, setHasApprovedBooking] = useState(false);

  useEffect(() => {
    checkApprovedBooking();
    loadPaymentAccounts();
  }, [ownerId, tenantId]);

  const checkApprovedBooking = async () => {
    try {
      // Check if there's an approved booking between this owner and tenant
      const allBookings = await db.list('bookings');
      const approvedBooking = allBookings.find((booking: any) => 
        booking.ownerId === ownerId && 
        booking.tenantId === tenantId &&
        booking.status === 'approved'
      );
      
      setHasApprovedBooking(!!approvedBooking);
      if (onVisibilityChange) {
        onVisibilityChange(!!approvedBooking);
      }
      console.log('📋 Approved booking check:', {
        hasApprovedBooking: !!approvedBooking,
        ownerId,
        tenantId
      });
    } catch (error) {
      console.error('Error checking approved booking:', error);
      setHasApprovedBooking(false);
      if (onVisibilityChange) {
        onVisibilityChange(false);
      }
    }
  };

  const loadPaymentAccounts = async () => {
    try {
      setLoading(true);
      
      const allAccounts = await db.list<PaymentAccount>('payment_accounts');
      const ownerAccounts = allAccounts
        .filter(account => account.ownerId === ownerId && account.isActive)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPaymentAccounts(ownerAccounts);
    } catch (error) {
      console.error('Error loading payment accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      // In React Native, we would use Clipboard API
      // For web, we can use navigator.clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showAlert('Copied!', `${label} copied to clipboard`);
      } else {
        showAlert('Copied!', `${label} copied to clipboard`);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showAlert('Error', 'Failed to copy to clipboard');
    }
  };

  // Don't show payment methods if there's no approved booking
  if (!hasApprovedBooking) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </View>
    );
  }

  if (paymentAccounts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Ionicons name="card-outline" size={20} color="#6B7280" />
          <Text style={styles.title}>
            {isCurrentUserOwner ? 'Your Payment Methods' : 'Payment Methods'}
          </Text>
        </View>
        <Text style={styles.emptyText}>
          {isCurrentUserOwner 
            ? 'Add payment methods in settings to receive payments'
            : 'No payment methods available yet'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.headerContainer}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Ionicons name="card-outline" size={20} color="#3B82F6" />
        <Text style={styles.title}>
          {isCurrentUserOwner ? 'Your Payment Methods' : 'Payment Methods'}
        </Text>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6B7280" 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.methodsContainer}>
          {paymentAccounts.map((account) => {
            const paymentType = PAYMENT_TYPES.find(t => t.id === account.type);
            
            return (
              <View key={account.id} style={styles.methodCard}>
                <View style={styles.methodHeader}>
                  {paymentType?.iconImage ? (
                    <Image 
                      source={paymentType.iconImage} 
                      style={styles.methodIconImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ fontSize: 24, marginRight: 8 }}>{paymentType?.icon}</Text>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodName}>{paymentType?.name}</Text>
                    <Text style={styles.accountName}>{account.accountName}</Text>
                  </View>
                </View>
                
                <View style={styles.methodDetails}>
                  {account.type === 'cash' ? (
                    <View style={styles.cashInstructionsContainer}>
                      <Text style={styles.detailLabel}>
                        Instructions:
                      </Text>
                      <TouchableOpacity
                        style={styles.cashCopyButton}
                        onPress={() => copyToClipboard(account.accountNumber, 'Instructions')}
                      >
                        <Text style={styles.cashInstructionsText}>{account.accountNumber}</Text>
                        <Ionicons name="copy-outline" size={16} color="#6B7280" />
                      </TouchableOpacity>
                      {account.accountDetails && (
                        <Text style={styles.detailNotes}>{account.accountDetails}</Text>
                      )}
                    </View>
                  ) : (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Account Number:</Text>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyToClipboard(account.accountNumber, 'Account number')}
                        >
                          <Text style={styles.detailValue}>{account.accountNumber}</Text>
                          <Ionicons name="copy-outline" size={16} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                      {account.accountDetails && (
                        <Text style={styles.detailNotes}>{account.accountDetails}</Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  methodsContainer: {
    marginTop: 12,
    gap: 12,
  },
  methodCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  accountName: {
    fontSize: 14,
    color: '#6B7280',
  },
  methodDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    flexShrink: 1,
  },
  detailNotes: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    fontStyle: 'italic',
    marginTop: 8,
  },
  cashInstructionsContainer: {
    width: '100%',
  },
  cashCopyButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  cashInstructionsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    flexShrink: 1,
  },
  methodIconImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
});

