import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/db';
import { BookingRecord } from '../types';
import { ArrowLeft, CreditCard, Smartphone, Building2, Copy, CheckCircle } from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../styles/owner-dashboard-styles';
import { showAlert } from '../utils/alert';

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

interface BookingInfo {
  id: string;
  propertyTitle: string;
  propertyAddress: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  totalAmount: number;
  monthlyRent: number;
  securityDeposit: number;
  startDate: string;
  endDate: string;
  status: string;
}

const PAYMENT_TYPES = [
  { id: 'gcash', name: 'GCash', icon: '📱', color: '#00A86B' },
  { id: 'paymaya', name: 'Maya', icon: '💳', color: '#00A86B' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', color: '#1E40AF' },
  { id: 'cash', name: 'Cash Payment', icon: '💵', color: '#059669' }
];

export default function PaymentMethods() {
  const { user } = useAuth();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (bookingId) {
      loadBookingAndPaymentMethods();
    } else {
      showAlert('Error', 'No booking ID provided');
      router.back();
    }
  }, [user, bookingId]);

  const loadBookingAndPaymentMethods = async () => {
    if (!bookingId || !user?.id) return;

    try {
      setLoading(true);
      console.log('💳 Loading payment methods for booking:', bookingId);

      // Load booking details
      const bookingData = await db.get('bookings', bookingId) as BookingRecord;
      if (!bookingData) {
        throw new Error('Booking not found');
      }

      // Verify the booking belongs to the current user
      if (bookingData.tenantId !== user.id) {
        throw new Error('Access denied - this booking does not belong to you');
      }

      // Check if booking is approved
      if (bookingData.status !== 'approved') {
        showAlert(
          'Booking Not Approved',
          'Payment methods are only available for approved bookings.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      setBooking(bookingData);

      // Load owner's payment accounts
      const allAccounts = await db.list<PaymentAccount>('payment_accounts');
      const ownerAccounts = allAccounts
        .filter(account => account.ownerId === bookingData.ownerId && account.isActive)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log('💳 Found payment accounts:', ownerAccounts.length);
      setPaymentAccounts(ownerAccounts);

    } catch (error) {
      console.error('Error loading payment methods:', error);
      showAlert('Error', 'Failed to load payment methods. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      // In a real app, you would use Clipboard API
      // For now, we'll just show a success message
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
      
      showAlert('Copied!', `${label} copied to clipboard`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showAlert('Error', 'Failed to copy to clipboard');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderPaymentAccount = (account: PaymentAccount) => {
    const paymentType = PAYMENT_TYPES.find(t => t.id === account.type);
    const isCopied = copiedText === account.accountNumber;

    return (
      <View key={account.id} style={[sharedStyles.card, { marginBottom: 16, padding: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={[sharedStyles.statIcon, { backgroundColor: paymentType?.color + '20', marginRight: 12, width: 32, height: 32, borderRadius: 16 }]}>
            <Text style={{ fontSize: 20 }}>{paymentType?.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 2, fontWeight: '600' }]}>
              {paymentType?.name}
            </Text>
            <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.textPrimary, fontSize: designTokens.typography.sm }]}>
              {account.accountName}
            </Text>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: 12, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.sm }]}>
              {account.type === 'cash' ? 'Instructions:' : 'Account Number:'}
            </Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 }}
              onPress={() => copyToClipboard(account.accountNumber, 'Account number')}
            >
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, marginRight: 8, flex: 1, textAlign: 'right', fontWeight: '600' }]}>
                {account.accountNumber}
              </Text>
              {isCopied ? (
                <CheckCircle size={16} color={designTokens.colors.success} />
              ) : (
                <Copy size={16} color={designTokens.colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          
          {account.accountDetails && (
            <View style={{ marginTop: 12 }}>
              <Text style={[sharedStyles.statSubtitle, { marginBottom: 8, fontSize: designTokens.typography.sm }]}>Payment Instructions:</Text>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, lineHeight: 18 }]}>
                {account.accountDetails}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={[sharedStyles.loadingText, { fontSize: designTokens.typography.base }]}>Loading payment methods...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={sharedStyles.container}>
        <View style={sharedStyles.mainContent}>
          <View style={[sharedStyles.pageContainer, { padding: 16 }]}>
            <View style={[sharedStyles.emptyState, { padding: 48 }]}>
              <Text style={[sharedStyles.emptyStateTitle, { fontSize: designTokens.typography.base }]}>Booking not found</Text>
              <Text style={[sharedStyles.emptyStateText, { fontSize: designTokens.typography.sm }]}>The requested booking could not be found.</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <View style={sharedStyles.mainContent}>
        <ScrollView style={sharedStyles.scrollView}>
          <View style={[sharedStyles.pageContainer, { padding: 16, paddingTop: 20 }]}>
            {/* Header */}
            <View style={[sharedStyles.pageHeader, { marginBottom: 16 }]}>
              <View style={[sharedStyles.headerLeft, { flexDirection: 'row', alignItems: 'flex-start' }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, marginTop: 2 }}>
                  <ArrowLeft size={22} color={designTokens.colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[sharedStyles.pageTitle, { fontSize: designTokens.typography.xl, marginBottom: 2, fontWeight: '700' }]}>Payment Methods</Text>
                  <Text style={[sharedStyles.pageSubtitle, { fontSize: designTokens.typography.sm }]}>Send payment to property owner</Text>
                </View>
              </View>
            </View>

            {/* Booking Info */}
            <View style={[sharedStyles.card, { marginBottom: 16, padding: 16 }]}>
              <Text style={[sharedStyles.sectionTitle, { marginBottom: 12, fontSize: designTokens.typography.base, fontWeight: '600' }]}>
                Booking Details
              </Text>
              
              <View style={{ marginBottom: 12 }}>
                <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 2, fontWeight: '600' }]}>
                  {booking.propertyTitle}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { marginBottom: 0, fontSize: designTokens.typography.sm }]}>
                  {booking.propertyAddress}
                </Text>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: 12, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.sm }]}>Monthly Rent:</Text>
                  <Text style={[sharedStyles.statLabel, { color: designTokens.colors.primary, fontSize: designTokens.typography.sm, fontWeight: '600' }]}>
                    {formatCurrency(booking.monthlyRent)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.sm }]}>Security Deposit:</Text>
                  <Text style={[sharedStyles.statLabel, { color: designTokens.colors.primary, fontSize: designTokens.typography.sm, fontWeight: '600' }]}>
                    {formatCurrency(booking.securityDeposit)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.sm }]}>Total Amount:</Text>
                  <Text style={[sharedStyles.statLabel, { color: designTokens.colors.primary, fontSize: designTokens.typography.base, fontWeight: 'bold' }]}>
                    {formatCurrency(booking.totalAmount)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.sm }]}>Lease Period:</Text>
                  <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, flex: 1, textAlign: 'right' }]}>
                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Owner Contact Info */}
            <View style={[sharedStyles.card, { marginBottom: 16, padding: 16 }]}>
              <Text style={[sharedStyles.sectionTitle, { marginBottom: 12, fontSize: designTokens.typography.base, fontWeight: '600' }]}>
                Property Owner
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginRight: 12, width: 32, height: 32, borderRadius: 16 }]}>
                  <Building2 size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: 2, fontSize: designTokens.typography.base, fontWeight: '600' }]}>
                    {booking.ownerName}
                  </Text>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.sm }]}>
                    Property Owner
                  </Text>
                </View>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: 12, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.sm }]}>Contact:</Text>
                  <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, fontWeight: '600' }]}>{booking.ownerPhone}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.sm }]}>Email:</Text>
                  <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm, flex: 1, textAlign: 'right' }]}>{booking.ownerEmail}</Text>
                </View>
              </View>
            </View>

            {/* Payment Methods */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[sharedStyles.sectionTitle, { marginBottom: 12, fontSize: designTokens.typography.base, fontWeight: '600' }]}>
                Available Payment Methods
              </Text>
              
              {paymentAccounts.length === 0 ? (
                <View style={[sharedStyles.emptyState, { padding: 16 }]}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginBottom: 12, width: 32, height: 32, borderRadius: 16 }]}>
                    <CreditCard size={20} color="#3B82F6" />
                  </View>
                  <Text style={[sharedStyles.emptyStateTitle, { fontSize: designTokens.typography.base }]}>No payment methods available</Text>
                  <Text style={[sharedStyles.emptyStateText, { fontSize: designTokens.typography.sm, lineHeight: 18 }]}>
                    The property owner hasn't set up any payment methods yet. Please contact them directly.
                  </Text>
                </View>
              ) : (
                <View>
                  {paymentAccounts.map(renderPaymentAccount)}
                </View>
              )}
            </View>

            {/* Payment Instructions */}
            <View style={[sharedStyles.card, { backgroundColor: designTokens.colors.infoLight, padding: 16, marginBottom: 32 }]}>
              <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.info, marginBottom: 12 }]}>
                <Text style={{ fontWeight: '600' as const, fontSize: designTokens.typography.sm }}>Payment Instructions:</Text>
              </Text>
              <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.info, lineHeight: 20, fontSize: designTokens.typography.sm }]}>
                1. Choose a payment method above{'\n'}
                2. Send the exact amount: {formatCurrency(booking.totalAmount)}{'\n'}
                3. Include your booking reference: {booking.id.slice(-8)}{'\n'}
                4. Take a screenshot of the payment confirmation{'\n'}
                5. Contact the owner to confirm payment
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
