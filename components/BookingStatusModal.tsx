import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { CheckCircle, Ban, Home, Calendar, Coins, X } from 'lucide-react-native';
import { BookingRecord } from '@/types';

interface BookingStatusModalProps {
  visible: boolean;
  booking: BookingRecord | null;
  status: 'approved' | 'rejected';
  onClose: () => void;
  onViewBooking?: () => void;
}

const { width } = Dimensions.get('window');

export default function BookingStatusModal({
  visible,
  booking,
  status,
  onClose,
  onViewBooking,
}: BookingStatusModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!booking) return null;

  const isApproved = status === 'approved';
  const Icon = isApproved ? CheckCircle : Ban;
  const iconColor = isApproved ? '#10B981' : '#EF4444';
  const bgColor = isApproved ? '#ECFDF5' : '#FEF2F2';
  const borderColor = isApproved ? '#D1FAE5' : '#FEE2E2';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
            <Icon size={64} color={iconColor} fill={iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isApproved ? '🎉 Booking Approved!' : '❌ Booking Rejected'}
          </Text>

          {/* Property Info */}
          <View style={styles.propertyInfo}>
            <View style={styles.propertyRow}>
              <Home size={16} color="#6B7280" />
              <Text style={styles.propertyTitle} numberOfLines={2}>
                {booking.propertyTitle}
              </Text>
            </View>
            {booking.selectedRoom !== undefined && (
              <View style={styles.propertyRow}>
                <Home size={16} color="#10B981" />
                <Text style={[styles.propertyText, { color: '#10B981', fontWeight: '600' }]}>
                  Room {booking.selectedRoom + 1}
                </Text>
              </View>
            )}
            <View style={styles.propertyRow}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.propertyText}>
                Move-in: {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={styles.propertyRow}>
              <Coins size={16} color="#6B7280" />
              <Text style={styles.propertyText}>
                Monthly Rent: ₱{booking.monthlyRent?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>

          {/* Message */}
          <View style={[styles.messageContainer, { backgroundColor: bgColor, borderColor }]}>
            <Text style={styles.messageText}>
              {isApproved
                ? 'Congratulations! Your booking request has been approved by the property owner. You can now proceed with payment and coordinate your move-in.'
                : 'Unfortunately, your booking request has been rejected by the property owner. You can explore other available properties or contact the owner for more information.'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {isApproved && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  onClose();
                  if (onViewBooking) {
                    onViewBooking();
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>View Booking Details</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                {isApproved ? 'Continue' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  propertyInfo: {
    marginBottom: 20,
    gap: 12,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  propertyText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  messageContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});

