import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PriceRangeSelector, ButtonCarousel, BarangaySearch } from '@components/forms';
import { PriceRange } from '@/utils';
import type { ButtonOption } from '@/types';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { dispatchCustomEvent } from '@/utils/custom-events';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');


const propertyTypes: ButtonOption[] = [
  { id: 'any', label: 'Any Type' },
  { id: 'House', label: 'House' },
  { id: 'Apartment', label: 'Apartment' },
  { id: 'Condo', label: 'Condo' },
  { id: 'Bedspace', label: 'Bedspace' }
];

export default function FilterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 1000, max: 5000 });
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('any');
  
  // Check if this is for featured properties only
  const isFeaturedOnly = params.featuredOnly === 'true';
  const pageTitle = params.title as string || 'Filters';

  useEffect(() => {
    if (isFeaturedOnly) {
      console.log('🎯 Filter page opened for featured properties only');
      // Pre-select some filters that make sense for featured properties
      setPriceRange({ min: 1000, max: 10000 }); // Wider range for featured
    }
  }, [isFeaturedOnly]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#1E40AF']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="options" size={28} color="white" />
            </View>
            <Text style={styles.headerTitle}>{pageTitle}</Text>
            <Text style={styles.headerSubtitle}>
              {isFeaturedOnly ? 'Filter featured properties' : 'Find your perfect home'}
            </Text>
          </View>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          {/* Property Type Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="home" size={20} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Property Type</Text>
              </View>
              {selectedPropertyType !== 'any' && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>SELECTED</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionDescription}>
              Choose the type of property you're looking for
            </Text>
            <ButtonCarousel
              options={propertyTypes}
              selectedId={selectedPropertyType}
              onSelect={setSelectedPropertyType}
              defaultSelectedId="any"
            />
            {selectedPropertyType !== 'any' && (
              <View style={styles.selectionIndicator}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.selectionText}>
                  Showing {propertyTypes.find(p => p.id === selectedPropertyType)?.label} properties only
                </Text>
              </View>
            )}
          </View>

          {/* Price Range Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="cash" size={20} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Price Range</Text>
              </View>
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>₱{priceRange.min.toLocaleString()} - ₱{priceRange.max.toLocaleString()}</Text>
              </View>
            </View>
            <PriceRangeSelector
              priceRange={priceRange}
              onRangeChange={setPriceRange}
            />
          </View>

          {/* Barangay Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="location" size={20} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Barangay (BRGY)</Text>
              </View>
              {selectedBarangay && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>SELECTED</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionDescription}>
              Choose a specific barangay to filter properties
            </Text>
            <BarangaySearch
              label=""
              value={selectedBarangay}
              onChange={setSelectedBarangay}
              placeholder="Select barangay..."
            />
            {selectedBarangay && (
              <View style={styles.selectionIndicator}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.selectionText}>
                  Showing properties in {selectedBarangay} only
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Pressable
              style={styles.applyButton}
              onPress={() => {
                // Handle filter application
                const filters = { 
                  propertyType: selectedPropertyType, 
                  priceRange, 
                  barangay: selectedBarangay,
                  featuredOnly: isFeaturedOnly
                };
                console.log('Applying filters:', filters);
                
                // Dispatch filter changes to the dashboard
                const filterDetail = {
                  propertyType: selectedPropertyType,
                  priceRange: priceRange,
                  barangay: selectedBarangay
                };
                console.log('🚀 Dispatching filter event:', filterDetail);
                dispatchCustomEvent('filtersApplied', filterDetail);
                console.log('✅ Filter event dispatched successfully');
                
                if (isFeaturedOnly) {
                  console.log('🎯 Navigating to featured properties view');
                  // Navigate back to dashboard with featured filter
                  router.push({
                    pathname: '/(tabs)',
                    params: { featuredFilter: 'true' }
                  });
                } else {
                  // Navigate back to dashboard with filters applied
                  console.log('🔄 Navigating back to dashboard with filters applied');
                  router.back();
                }
              }}
            >
              <LinearGradient
                colors={['#3B82F6', '#1E40AF']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>
                    {isFeaturedOnly ? "View Featured Properties" : "Apply Filters"}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
            
            {/* Clear Filters Button */}
            {(selectedPropertyType !== 'any' || selectedBarangay || priceRange.min !== 1000 || priceRange.max !== 5000) && (
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setSelectedPropertyType('any');
                  setSelectedBarangay('');
                  setPriceRange({ min: 1000, max: 5000 });
                }}
              >
                <Ionicons name="refresh" size={16} color="#6B7280" />
                <Text style={styles.clearButtonText}>Clear All Filters</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    minHeight: height * 0.7,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  selectedBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  selectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    marginLeft: 8,
    flex: 1,
  },
  actionContainer: {
    marginTop: 20,
    gap: 16,
  },
  applyButton: {
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
}); 