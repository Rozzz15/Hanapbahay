import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, ScrollView, Alert, Platform, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { X, Share2, Download } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';
import { getRentHistorySummary, createRentPayment, getNextDueDate } from '@/utils/tenant-payments';
import { getQRCodeProps } from '@/utils/qr-code-generator';
import { BookingRecord } from '@/types';

interface PaymentAccount {
  id: string;
  ownerId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer' | 'cash';
  accountName: string;
  accountNumber: string;
  accountDetails: string;
  qrCodeImageUri?: string; // QR code image URI for GCash/PayMaya payments
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
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [selectedQRCodeAccount, setSelectedQRCodeAccount] = useState<PaymentAccount | null>(null);
  const [nextDuePayment, setNextDuePayment] = useState<any>(null);

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

  const handleViewQRCode = async (account: PaymentAccount) => {
    if (!account.qrCodeImageUri) {
      showAlert('No QR Code', 'This payment method does not have a QR code uploaded.');
      return;
    }

    // Only tenants can view QR codes (not owners)
    if (isCurrentUserOwner) {
      return;
    }

    try {
      // First, check for an approved booking (even if paymentStatus is not 'paid' yet)
      const allBookings = await db.list<BookingRecord>('bookings');
      const approvedBooking = allBookings.find(
        b => b.tenantId === tenantId && 
        b.ownerId === ownerId &&
        b.status === 'approved'
      );

      if (!approvedBooking) {
        showAlert('No Approved Booking', 'You don\'t have an approved booking with this owner yet.');
        return;
      }

      // Get rent history (this might not have nextDueDate if paymentStatus is not 'paid')
      const rentHistory = await getRentHistorySummary(tenantId);
      
      let paymentToUse = null;
      let nextDueDate: string | undefined;
      let nextDueAmount: number | undefined;

      // If rent history has next due date, use it
      if (rentHistory.nextDueDate && rentHistory.nextDueAmount) {
        nextDueDate = rentHistory.nextDueDate;
        nextDueAmount = rentHistory.nextDueAmount;
        
        // Find the payment for the next due date
        paymentToUse = rentHistory.payments.find(
          p => p.dueDate === nextDueDate && (p.status === 'pending' || p.status === 'overdue')
        );
      }

      // If no payment found, calculate first payment based on booking
      if (!paymentToUse) {
        // Calculate first payment due date (1 month after start date)
        const startDate = new Date(approvedBooking.startDate);
        nextDueDate = getNextDueDate(approvedBooking.startDate);
        nextDueAmount = approvedBooking.monthlyRent || 0;

        // Check if payment already exists for this due date
        const existingPayment = rentHistory.payments.find(
          p => p.bookingId === approvedBooking.id && p.dueDate === nextDueDate
        );

        if (existingPayment) {
          paymentToUse = existingPayment;
        } else {
          // Create the first payment if it doesn't exist
          const paymentMonth = nextDueDate.substring(0, 7); // YYYY-MM format
          paymentToUse = await createRentPayment(approvedBooking.id, paymentMonth, nextDueDate);
        }
      }

      if (!paymentToUse) {
        showAlert('Payment Not Found', 'Unable to create payment details. Please try again later.');
        return;
      }

      setNextDuePayment(paymentToUse);
      setSelectedQRCodeAccount(account);
      setShowQRCodeModal(true);
    } catch (error) {
      console.error('Error loading payment for QR code:', error);
      showAlert('Error', 'Failed to load payment details. Please try again.');
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
                      {/* Show QR Code button for GCash/PayMaya if tenant and QR code exists */}
                      {!isCurrentUserOwner && (account.type === 'gcash' || account.type === 'paymaya') && account.qrCodeImageUri && (
                        <TouchableOpacity
                          style={styles.qrCodeButton}
                          onPress={() => handleViewQRCode(account)}
                        >
                          <Ionicons name="qr-code-outline" size={18} color="#3B82F6" />
                          <Text style={styles.qrCodeButtonText}>View QR Code</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* QR Code Modal */}
      {showQRCodeModal && selectedQRCodeAccount && nextDuePayment && (
        <Modal
          visible={showQRCodeModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowQRCodeModal(false);
            setSelectedQRCodeAccount(null);
            setNextDuePayment(null);
          }}
        >
          <View style={styles.qrCodeModalOverlay}>
            <View style={styles.qrCodeModalContainer}>
              <View style={styles.qrCodeModalHeader}>
                <Text style={styles.qrCodeModalTitle}>
                  Scan to Pay with {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={styles.qrCodeModalShareButton}
                    onPress={async () => {
                      try {
                        const { generatePaymentQRCodeString } = await import('@/utils/qr-code-generator');
                        const qrData = generatePaymentQRCodeString(nextDuePayment, selectedQRCodeAccount);
                        const paymentMethodName = selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya';
                        const paymentDetails = `${paymentMethodName} Payment QR Code\n\nAmount: ₱${nextDuePayment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nReference: ${nextDuePayment.receiptNumber}\nAccount: ${selectedQRCodeAccount.accountName} (${selectedQRCodeAccount.accountNumber})\nPayment Month: ${nextDuePayment.paymentMonth}\nDue Date: ${new Date(nextDuePayment.dueDate).toLocaleDateString()}\n\nScan the QR code in the app to pay.`;
                        
                        if (Platform.OS === 'web') {
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(`${paymentDetails}\n\nQR Code Data:\n${qrData}`);
                            Alert.alert('Copied', 'Payment details copied to clipboard!');
                          }
                        } else {
                          try {
                            await Share.share({
                              message: `${paymentDetails}\n\nQR Code Data:\n${qrData}`,
                              title: `${paymentMethodName} Payment QR Code`,
                            });
                          } catch (shareError) {
                            const Clipboard = await import('expo-clipboard');
                            await Clipboard.setStringAsync(`${paymentDetails}\n\nQR Code Data:\n${qrData}`);
                            Alert.alert('Copied', 'Payment details copied to clipboard!');
                          }
                        }
                      } catch (error) {
                        console.error('Error sharing QR code:', error);
                        Alert.alert('Error', 'Failed to share QR code. Please try again.');
                      }
                    }}
                  >
                    <Share2 size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.qrCodeModalCloseButton}
                    onPress={() => {
                      setShowQRCodeModal(false);
                      setSelectedQRCodeAccount(null);
                      setNextDuePayment(null);
                    }}
                  >
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.qrCodeModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.qrCodeSection}>
                  <Text style={styles.qrCodeLabel}>Payment QR Code</Text>
                  <Text style={styles.qrCodeSubtitle}>
                    Scan this QR-PH code with your {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'} app{'\n'}
                    {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'} will recognize the payment details automatically{'\n'}
                    Or share it to another device to scan
                  </Text>
                  
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      {...getQRCodeProps(nextDuePayment, selectedQRCodeAccount, 250)}
                    />
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[styles.qrCodeShareButton, { flex: 1 }]}
                      onPress={async () => {
                        try {
                          const { generateGCashQRPHCode } = await import('@/utils/qr-code-generator');
                          // For PayMaya, use dynamic QR codes (with amount). For GCash, use static (no amount)
                          const includeAmount = selectedQRCodeAccount.type === 'paymaya';
                          const qrData = generateGCashQRPHCode(nextDuePayment, selectedQRCodeAccount, includeAmount);
                          
                          // Generate QR code image URL using a QR code API
                          const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrData)}`;
                          
                          if (Platform.OS === 'web') {
                            // For web, fetch the image and download it as a blob
                            try {
                              const response = await fetch(qrCodeImageUrl);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `payment-qr-code-${nextDuePayment.receiptNumber}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              Alert.alert('Success', 'QR code downloaded successfully!');
                            } catch (fetchError) {
                              // Fallback: direct link download
                              const link = document.createElement('a');
                              link.href = qrCodeImageUrl;
                              link.download = `payment-qr-code-${nextDuePayment.receiptNumber}.png`;
                              link.target = '_blank';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              Alert.alert('Success', 'QR code download started!');
                            }
                          } else {
                            // For mobile, download and save to device
                            const FileSystem = await import('expo-file-system/legacy');
                            const Sharing = await import('expo-sharing');
                            const MediaLibrary = await import('expo-media-library');
                            
                            const FileSystemModule = FileSystem.default || FileSystem;
                            const SharingModule = Sharing.default || Sharing;
                            const MediaLibraryModule = MediaLibrary.default || MediaLibrary;
                            
                            const fileName = `payment-qr-code-${nextDuePayment.receiptNumber}.png`;
                            const fileUri = FileSystemModule.documentDirectory + fileName;
                            
                            // Download the QR code image
                            const downloadResult = await FileSystemModule.downloadAsync(qrCodeImageUrl, fileUri);
                            
                            // Try to save to media library (Photos/Gallery) first
                            try {
                              const { status } = await MediaLibraryModule.requestPermissionsAsync();
                              if (status === 'granted') {
                                const asset = await MediaLibraryModule.createAssetAsync(downloadResult.uri);
                                await MediaLibraryModule.createAlbumAsync('HanapBahay', asset, false);
                                Alert.alert('Success', 'QR code saved to your photo gallery!');
                                return;
                              }
                            } catch (mediaError) {
                              console.log('Could not save to media library, using sharing instead:', mediaError);
                            }
                            
                            // Fallback: Use sharing to save/download
                            if (await SharingModule.isAvailableAsync()) {
                              await SharingModule.shareAsync(downloadResult.uri, {
                                mimeType: 'image/png',
                                dialogTitle: 'Save QR Code',
                                UTI: 'public.png',
                              });
                            } else {
                              Alert.alert('Success', `QR code saved to: ${downloadResult.uri}`);
                            }
                          }
                        } catch (error) {
                          console.error('Error downloading QR code:', error);
                          Alert.alert('Error', `Failed to download QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                      }}
                    >
                      <Download size={18} color="#3B82F6" />
                      <Text style={styles.qrCodeShareButtonText}>Download QR Code</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.qrCodeShareButton, { flex: 1 }]}
                      onPress={async () => {
                      try {
                        const { generatePaymentQRCodeString } = await import('@/utils/qr-code-generator');
                        const qrData = generatePaymentQRCodeString(nextDuePayment, selectedQRCodeAccount);
                        const paymentMethodName = selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya';
                        const paymentDetails = `${paymentMethodName} Payment QR Code\n\nAmount: ₱${nextDuePayment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nReference: ${nextDuePayment.receiptNumber}\nAccount: ${selectedQRCodeAccount.accountName} (${selectedQRCodeAccount.accountNumber})\nPayment Month: ${nextDuePayment.paymentMonth}\nDue Date: ${new Date(nextDuePayment.dueDate).toLocaleDateString()}\n\nScan the QR code in the app to pay.`;
                        
                        if (Platform.OS === 'web') {
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(`${paymentDetails}\n\nQR Code Data:\n${qrData}`);
                            Alert.alert('Copied', 'Payment details copied to clipboard!');
                          }
                        } else {
                          try {
                            await Share.share({
                              message: `${paymentDetails}\n\nQR Code Data:\n${qrData}`,
                              title: `${paymentMethodName} Payment QR Code`,
                            });
                          } catch (shareError) {
                            const Clipboard = await import('expo-clipboard');
                            await Clipboard.setStringAsync(`${paymentDetails}\n\nQR Code Data:\n${qrData}`);
                            Alert.alert('Copied', 'Payment details copied to clipboard!');
                          }
                        }
                      } catch (error) {
                        console.error('Error sharing QR code:', error);
                        Alert.alert('Error', 'Failed to share QR code. Please try again.');
                      }
                    }}
                  >
                    <Share2 size={18} color="#3B82F6" />
                    <Text style={styles.qrCodeShareButtonText}>Share QR Code</Text>
                  </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.qrCodePaymentDetails}>
                  <Text style={styles.qrCodeDetailsTitle}>Payment Details</Text>
                  
                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Amount:</Text>
                    <Text style={styles.qrCodeDetailValue}>
                      ₱{nextDuePayment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Reference:</Text>
                    <Text style={styles.qrCodeDetailValue}>{nextDuePayment.receiptNumber}</Text>
                  </View>

                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Account:</Text>
                    <Text style={styles.qrCodeDetailValue}>
                      {selectedQRCodeAccount.accountName} ({selectedQRCodeAccount.accountNumber})
                    </Text>
                  </View>

                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Payment Month:</Text>
                    <Text style={styles.qrCodeDetailValue}>
                      {new Date(nextDuePayment.paymentMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </Text>
                  </View>

                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Due Date:</Text>
                    <Text style={styles.qrCodeDetailValue}>
                      {new Date(nextDuePayment.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  qrCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  qrCodeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  qrCodeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  qrCodeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  qrCodeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  qrCodeModalShareButton: {
    padding: 8,
    borderRadius: 8,
  },
  qrCodeModalCloseButton: {
    padding: 8,
    borderRadius: 8,
  },
  qrCodeModalBody: {
    padding: 20,
  },
  qrCodeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  qrCodeSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrCodeShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  qrCodeShareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  qrCodePaymentDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrCodeDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  qrCodeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  qrCodeDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  qrCodeDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
});

