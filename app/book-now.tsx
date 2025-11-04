import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  SafeAreaView, 
  TextInput,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { createBooking } from '@/utils/booking';
import { useToast } from '@/components/ui/toast';
import { ArrowLeft, Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';

// Peso icon component
const PesoIcon = ({ size = 20, color = "#FFFFFF" }) => (
  <Text style={{ fontSize: size, color, fontWeight: 'bold' }}>₱</Text>
);

// Custom Calendar Component
const CustomCalendar = ({ 
  selectedDate, 
  onDateSelect, 
  onClose 
}: { 
  selectedDate: Date; 
  onDateSelect: (date: Date) => void; 
  onClose: () => void; 
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // State for currently viewed month/year (for navigation)
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  // Update view when selectedDate changes externally
  useEffect(() => {
    setViewMonth(selectedDate.getMonth());
    setViewYear(selectedDate.getFullYear());
  }, [selectedDate]);
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Get first day of month and number of days
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day);
    calendarDays.push(date);
  }
  
  // Navigation functions
  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  
  const goToToday = () => {
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
  };
  
  // Generate year options (current year ± 10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = currentYear - 1; year <= currentYear + 10; year++) {
    yearOptions.push(year);
  }
  
  const handleYearSelect = (year: number) => {
    setViewYear(year);
    setShowYearPicker(false);
  };
  
  // Check if we can navigate to previous month (not before today's month)
  const canGoPrevious = () => {
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    return !(viewYear === todayYear && viewMonth === todayMonth);
  };
  
  return (
    <View style={styles.calendarContainer}>
      {/* Header with navigation */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        
        <View style={styles.calendarTitleContainer}>
          <TouchableOpacity 
            style={styles.monthYearButton}
            onPress={() => setShowYearPicker(!showYearPicker)}
          >
            <Text style={styles.calendarTitle}>
              {months[viewMonth]} {viewYear}
            </Text>
          </TouchableOpacity>
          
          {showYearPicker && (
            <View style={styles.yearPickerContainer}>
              <View style={styles.yearPickerBox}>
                <ScrollView style={styles.yearPickerScroll} showsVerticalScrollIndicator={false}>
                  {yearOptions.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearOption,
                        viewYear === year && styles.yearOptionSelected
                      ]}
                      onPress={() => handleYearSelect(year)}
                    >
                      <Text style={[
                        styles.yearOptionText,
                        viewYear === year && styles.yearOptionTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>
      
      {/* Navigation controls */}
      <View style={styles.calendarNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, !canGoPrevious() && styles.navButtonDisabled]}
          onPress={goToPreviousMonth}
          disabled={!canGoPrevious()}
        >
          <ChevronLeft size={20} color={canGoPrevious() ? "#374151" : "#D1D5DB"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.todayButton}
          onPress={goToToday}
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={goToNextMonth}
        >
          <ChevronRight size={20} color="#374151" />
        </TouchableOpacity>
      </View>
      
      {/* Week day headers */}
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day) => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>
      
      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={index} style={styles.calendarDay} />;
          }
          
          const dateOnly = new Date(date);
          dateOnly.setHours(0, 0, 0, 0);
          
          const isToday = dateOnly.getTime() === today.getTime();
          const isSelected = dateOnly.toDateString() === selectedDate.toDateString();
          const isPast = dateOnly < today;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                isSelected && styles.selectedDay,
                isToday && !isSelected && styles.todayDay,
                isPast && styles.pastDay
              ]}
              onPress={() => !isPast && onDateSelect(date)}
              disabled={isPast}
            >
              <Text style={[
                styles.dayText,
                isSelected && styles.selectedDayText,
                isToday && !isSelected && styles.todayDayText,
                isPast && styles.pastDayText
              ]}>
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Success Notification Component
const SuccessNotification = ({ 
  visible, 
  bookingId, 
  fadeAnim, 
  scaleAnim, 
  slideAnim, 
  checkmarkAnim,
  onViewBookings,
  onContinue
}: {
  visible: boolean;
  bookingId: string;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
  slideAnim: Animated.Value;
  checkmarkAnim: Animated.Value;
  onViewBookings: () => void;
  onContinue: () => void;
}) => {
  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.successOverlay,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ]
        }
      ]}
    >
      <View style={styles.successContainer}>
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successCircle}>
            <Animated.View 
              style={[
                styles.checkmarkContainer,
                {
                  transform: [{ scale: checkmarkAnim }]
                }
              ]}
            >
              <Text style={styles.checkmark}>✓</Text>
            </Animated.View>
          </View>
        </View>

        {/* Success Message */}
        <Text style={styles.successTitle}>Booking Submitted!</Text>
        <Text style={styles.successMessage}>
          Your booking request has been submitted successfully. The property owner will review your request and get back to you soon.
        </Text>

        {/* Booking ID */}
        <View style={styles.bookingIdContainer}>
          <Text style={styles.bookingIdLabel}>Booking ID:</Text>
          <Text style={styles.bookingIdValue}>{bookingId}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.successButtons}>
          <TouchableOpacity 
            style={styles.viewBookingsButton} 
            onPress={onViewBookings}
          >
            <Text style={styles.viewBookingsButtonText}>View My Bookings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.continueButton} 
            onPress={onContinue}
          >
            <Text style={styles.continueButtonText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

import { db } from '@/utils/db';

const { width } = Dimensions.get('window');

export default function BookNowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  
  const [propertyData, setPropertyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Booking form data
  const [startDate, setStartDate] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Calendar modal state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Animation states
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [bookingId, setBookingId] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  
  // Calculate total amount (only monthly rent)
  const [totalAmount, setTotalAmount] = useState(0);

  // Load property data
  const loadPropertyData = useCallback(async () => {
    const propertyId = params.id as string;
    
    if (!propertyId) {
      Alert.alert('Error', 'Property ID not provided');
      router.back();
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Loading property data for ID:', propertyId);
      
      const listing = await db.get('published_listings', propertyId) as any;
      
      if (!listing) {
        Alert.alert('Error', 'Property not found');
        router.back();
        return;
      }
      
      setPropertyData(listing);
      
      // Set default start date (today) - fix timezone issue
        const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setStartDate(formattedDate);
      
      console.log('✅ Property data loaded successfully');
      } catch (error) {
      console.error('❌ Error loading property data:', error);
      Alert.alert('Error', 'Failed to load property information');
        router.back();
    } finally {
      setLoading(false);
      }
  }, [params.id, router]);

  useEffect(() => {
    loadPropertyData();
  }, [loadPropertyData]);

  // Reset form state when screen comes into focus (for multiple bookings)
  useFocusEffect(
    useCallback(() => {
      // Reset form state when coming back to booking screen
      if (!showSuccessAnimation && !isProcessing) {
        resetFormState();
      }
    }, [showSuccessAnimation, isProcessing])
  );

  // Calculate total amount when property data changes
  useEffect(() => {
    if (propertyData) {
      const monthlyRent = propertyData.monthlyRent || 0;
      setTotalAmount(monthlyRent);
    }
  }, [propertyData]);

  // Calendar functions
  const openCalendar = () => {
    setShowCalendar(true);
  };

  const closeCalendar = () => {
    setShowCalendar(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Fix timezone issue by using local date components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    setStartDate(formattedDate);
    setShowCalendar(false);
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select move-in date';
    // Parse the date string to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Success animation function
  const showSuccessNotification = (id: string) => {
    setBookingId(id);
    setShowSuccessAnimation(true);
    
    // Reset animation values
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.3);
    slideAnim.setValue(-100);
    checkmarkAnim.setValue(0);
    
    // Animate success notification
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animate checkmark after main animation
      Animated.timing(checkmarkAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
    
    // Auto hide after 4 seconds
    setTimeout(() => {
      hideSuccessNotification();
    }, 4000);
  };

  const hideSuccessNotification = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessAnimation(false);
    });
  };

  // Reset form state for new booking
  const resetFormState = () => {
    setStartDate('');
    setSpecialRequests('');
    setSelectedDate(new Date());
    setIsProcessing(false);
    setShowSuccessAnimation(false);
    setBookingId('');
    
    // Reset animation values
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.3);
    slideAnim.setValue(-100);
    checkmarkAnim.setValue(0);
  };

  // Action handlers for success notification
  const handleViewBookings = () => {
    hideSuccessNotification();
    router.push('/(tabs)/bookings');
  };

  const handleContinueBrowsing = () => {
    hideSuccessNotification();
    // Reset form state before going back
    setTimeout(() => {
      resetFormState();
      router.back();
    }, 300); // Small delay to let animation complete
  };

  const validateForm = (): boolean => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Authentication Required',
        'Please log in to complete your booking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return false;
    }

    if (!startDate) {
      Alert.alert('Error', 'Please select your preferred start date');
      return false;
    }

    // Validate that the selected date is not in the past
    const [year, month, day] = startDate.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      Alert.alert(
        'Invalid Date',
        'Please select a date from today onwards. Past dates are not allowed.',
        [{ text: 'OK' }]
      );
      return false;
    }


    return true;
  };

  const handleConfirmBooking = async () => {
    console.log('🔄 Starting booking submission...');
    console.log('📊 Current state:', { 
      isProcessing, 
      showSuccessAnimation, 
      propertyId: propertyData?.id,
      tenantId: user?.id,
      startDate 
    });

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('✅ Form validated, processing booking...');

      const bookingData = {
        propertyId: propertyData.id,
        tenantId: user!.id,
        startDate,
        endDate: startDate, // Same as start date for monthly rental
        duration: 1, // Default to 1 month for monthly rental
        specialRequests: specialRequests || 'Standard booking request'
      };

      console.log('🔄 Creating booking with data:', bookingData);

      const booking = await createBooking(bookingData);
      console.log('✅ Booking created successfully:', booking.id);
      console.log('📊 Booking details:', {
        id: booking.id,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
        tenantId: booking.tenantId,
        tenantName: booking.tenantName,
        ownerId: booking.ownerId,
        ownerName: booking.ownerName,
        status: booking.status
      });

      // Show beautiful success animation
      showSuccessNotification(booking.id);

      // Reset processing state
      setIsProcessing(false);

    } catch (error: any) {
      console.error('❌ Error creating booking:', error);
      console.error('❌ Error details:', error.message);
      
      const errorMessage = error.message || 'Failed to create booking. Please try again.';
      Alert.alert('Booking Failed', errorMessage);
      
      // Reset processing state on error
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Now</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading property details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!propertyData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Now</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Property not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPropertyData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Now</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Summary */}
        <View style={styles.propertyCard}>
          <Text style={styles.propertyTitle}>{propertyData.propertyType} in {propertyData.address.split(',')[0]}</Text>
          <Text style={styles.propertyAddress}>{propertyData.address}</Text>
          
          <View style={styles.propertyDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Monthly Rent</Text>
              <Text style={styles.detailValue}>₱{propertyData.monthlyRent?.toLocaleString()}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Security Deposit</Text>
              <Text style={styles.detailValue}>₱{(propertyData.securityDeposit || 0).toLocaleString()}</Text>
            </View>
          </View>
                  </View>

        {/* Booking Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Booking Details</Text>
          
          {/* Start Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preferred Start Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={openCalendar}>
              <Calendar size={20} color="#6B7280" />
              <Text style={[styles.dateButtonText, !startDate && styles.placeholderText]}>
                {formatDisplayDate(startDate)}
                    </Text>
          </TouchableOpacity>
            <Text style={styles.inputHint}>Tap to select your move-in date</Text>
        </View>


        {/* Special Requests */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Requests (Optional)</Text>
          <TextInput
              style={styles.textArea}
            value={specialRequests}
            onChangeText={setSpecialRequests}
              placeholder="Any special requirements or requests..."
              placeholderTextColor="#9CA3AF"
            multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={styles.costCard}>
          <Text style={styles.costTitle}>Monthly Rental</Text>
          
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Monthly Rent</Text>
            <Text style={styles.costValue}>₱{(propertyData.monthlyRent || 0).toLocaleString()}</Text>
            </View>
          
          <View style={styles.costDivider} />
          
          <View style={styles.costItem}>
            <Text style={styles.totalLabel}>Monthly Amount</Text>
            <Text style={styles.totalValue}>₱{totalAmount.toLocaleString()}</Text>
              </View>
              </View>

        {/* Booking Terms */}
        <View style={styles.termsCard}>
          <View style={styles.termsHeader}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.termsTitle}>Booking Terms</Text>
            </View>
          
          <Text style={styles.termsText}>
            • Your booking request will be sent to the property owner for review{'\n'}
            • The owner has 48 hours to respond to your request{'\n'}
            • Monthly payment will be required upon approval{'\n'}
            • You can cancel your request before it's approved{'\n'}
            • All bookings are subject to the property's terms and conditions
          </Text>
          </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.bookButton, isProcessing && styles.bookButtonDisabled]}
          onPress={handleConfirmBooking}
          disabled={isProcessing}
        >
          <PesoIcon size={20} color="#FFFFFF" />
          <Text style={styles.bookButtonText}>
            {isProcessing ? 'Processing...' : 'Submit Booking Request'}
          </Text>
        </TouchableOpacity>
        
        {/* Debug: Reset button (only show if there are issues) */}
        {(isProcessing || showSuccessAnimation) && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetFormState}
          >
            <Text style={styles.resetButtonText}>Reset Form</Text>
          </TouchableOpacity>
        )}
        </View>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCalendar}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <CustomCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onClose={closeCalendar}
            />
          </View>
        </View>
      </Modal>

      {/* Success Notification */}
      <SuccessNotification
        visible={showSuccessAnimation}
        bookingId={bookingId}
        fadeAnim={fadeAnim}
        scaleAnim={scaleAnim}
        slideAnim={slideAnim}
        checkmarkAnim={checkmarkAnim}
        onViewBookings={handleViewBookings}
        onContinue={handleContinueBrowsing}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  propertyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  calendarContainer: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  calendarTitleContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  monthYearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  yearPickerContainer: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  yearPickerBox: {
    width: 140,
    maxHeight: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  yearPickerScroll: {
    maxHeight: 220,
  },
  yearOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  yearOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  yearOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedDay: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
  },
  todayDay: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  pastDay: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todayDayText: {
    color: '#059669',
    fontWeight: '600',
  },
  pastDayText: {
    color: '#9CA3AF',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  bookingIdContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  bookingIdLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  bookingIdValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  successButtons: {
    width: '100%',
    gap: 12,
  },
  viewBookingsButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  viewBookingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  continueButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
  },
  costCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  costTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  costDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  termsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
