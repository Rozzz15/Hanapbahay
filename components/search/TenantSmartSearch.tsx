import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Platform, Modal, Animated, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BARANGAYS } from '@/constants/Barangays';
import { AMENITIES, PROPERTY_TYPES } from '@/types/property';
import { SmartSearchParams, debounce } from '@/utils/search';

type Props = {
  value: SmartSearchParams;
  onChange: (params: SmartSearchParams) => void;
};

export default function TenantSmartSearch({ value, onChange }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [query, setQuery] = useState<string>(value.query || '');
  const [locationText, setLocationText] = useState<string>(value.location || '');
  const [minPrice, setMinPrice] = useState<string>(value.minPrice ? String(value.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState<string>(value.maxPrice ? String(value.maxPrice) : '');
  const [rooms, setRooms] = useState<number>(value.rooms || 0);
  const [amenities, setAmenities] = useState<string[]>(value.amenities || []);
  const [propertyType, setPropertyType] = useState<string>(value.propertyType || '');
  const [occupantType, setOccupantType] = useState<'Family' | 'Individual' | ''>((value as any).occupantType || '');
  const [popular, setPopular] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showBarangayDropdown, setShowBarangayDropdown] = useState<boolean>(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // Animation for focus state
  const focusAnimation = useRef(new Animated.Value(0)).current;

  // Check if any filters are active
  const hasActiveFilters = !!(locationText || minPrice || maxPrice || rooms || amenities.length || propertyType || occupantType);

  const debouncedEmit = useRef(
    debounce((params: SmartSearchParams) => onChange(params), 300)
  ).current;

  // Handle focus animation
  useEffect(() => {
    Animated.timing(focusAnimation, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  useEffect(() => {
    const next: SmartSearchParams = {
      query: query || undefined,
      location: locationText,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      rooms: rooms || 0,
      amenities: amenities.length ? amenities : undefined,
      propertyType: propertyType || undefined,
      occupantType: occupantType || undefined,
    };
    debouncedEmit(next);
  }, [query, locationText, minPrice, maxPrice, rooms, amenities, propertyType, occupantType]);

  // Auto-suggestions removed per request

  const toggleAmenity = (a: string) => {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const clearAll = () => {
    setQuery('');
    setLocationText('');
    setMinPrice('');
    setMaxPrice('');
    setRooms(0);
    setAmenities([]);
    setPropertyType('');
    setOccupantType('');
    onChange({});
  };

  // Color scheme colors
  const colors = {
    background: isDark ? '#1F2937' : '#FFFFFF',
    border: isDark ? '#374151' : '#E5E7EB',
    borderFocused: isDark ? '#10B981' : '#10B981',
    text: isDark ? '#F9FAFB' : '#111827',
    placeholder: isDark ? '#9CA3AF' : '#9CA3AF',
    icon: isDark ? '#9CA3AF' : '#6B7280',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
  };

  const borderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.borderFocused],
  });

  const shadowOpacity = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.15],
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIconWrapper} />
            <TextInput
              placeholder="Hanap ng paupahan…"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              returnKeyType="search"
              editable={true}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="default"
              textContentType="none"
            />
            {!!query && (
              <TouchableOpacity 
                onPress={() => setQuery('')} 
                style={styles.clearInputBtn}
                activeOpacity={0.6}
              >
                <View style={styles.clearButtonCircle}>
                  <Ionicons name="close" size={14} color="#6B7280" />
                </View>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setShowFilters(v => !v)}
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="options" 
              size={18} 
              color={hasActiveFilters ? "#FFFFFF" : "#10B981"} 
            />
            {hasActiveFilters && (
              <View style={styles.activeIndicator}>
                <Text style={styles.activeIndicatorText}>
                  {[locationText, minPrice || maxPrice, rooms, amenities.length, propertyType, occupantType].filter(Boolean).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {(hasActiveFilters || query) && (
        <TouchableOpacity 
          accessibilityRole="button" 
          onPress={clearAll} 
          style={styles.resetButton}
          activeOpacity={0.7}
        >
          <View style={styles.resetButtonInner}>
            <Ionicons name="close" size={14} color="#6B7280" />
            <Text style={styles.resetButtonText}>Clear all</Text>
          </View>
        </TouchableOpacity>
      )}

      {showFilters && (
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowFilters(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity 
                onPress={() => setShowFilters(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <View style={styles.modalCloseButtonInner}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.filters}>
        <View style={[styles.filterSection, styles.filterSectionFirst]}>
          <View style={styles.filterSectionLabel}>
            <Ionicons name="location" size={16} color="#10B981" />
            <Text style={styles.filterSectionLabelText}>Barangay</Text>
          </View>
          <View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.selectDisplay}
              onPress={() => setShowBarangayDropdown(v => !v)}
            >
              <Text style={[styles.selectDisplayText, !locationText && { color: '#9CA3AF' }]}>
                {locationText || 'Select barangay'}
              </Text>
              <Ionicons name={showBarangayDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
            </TouchableOpacity>
            {showBarangayDropdown && (
              <View style={styles.dropdownPanel}>
                {BARANGAYS.map((b) => {
                  const active = locationText === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                      onPress={() => { setLocationText(b); setShowBarangayDropdown(false); }}
                    >
                      <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{b}</Text>
                      {active && <Ionicons name="checkmark" size={16} color="#1E3A8A" />}
                    </TouchableOpacity>
                  );
                })}
                {!!locationText && (
                  <TouchableOpacity style={styles.dropdownClear} onPress={() => { setLocationText(''); setShowBarangayDropdown(false); }}>
                    <Ionicons name="close" size={14} color="#6B7280" />
                    <Text style={styles.dropdownClearText}>Clear selection</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.filterSectionLabel}>
            <Ionicons name="pricetag" size={16} color="#10B981" />
            <Text style={styles.filterSectionLabelText}>Price Range</Text>
          </View>
          <View style={styles.priceRow}>
            <View style={styles.filterFieldGrow}>
              <Ionicons name="pricetag" size={16} color="#6B7280" />
              <TextInput
                placeholder="Min Price"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={minPrice}
                onChangeText={setMinPrice}
                style={styles.filterInput}
              />
            </View>
            <Text style={styles.toText}>to</Text>
            <View style={styles.filterFieldGrow}>
              <Ionicons name="pricetag" size={16} color="#6B7280" />
              <TextInput
                placeholder="Max Price"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={maxPrice}
                onChangeText={setMaxPrice}
                style={styles.filterInput}
              />
            </View>
          </View>
        </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionLabel}>
                  <Ionicons name="home" size={16} color="#10B981" />
                  <Text style={styles.filterSectionLabelText}>Property Type</Text>
                </View>
                <View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.selectDisplay}
                    onPress={() => setShowPropertyDropdown(v => !v)}
                  >
                    <Text style={[styles.selectDisplayText, !propertyType && { color: '#9CA3AF' }]}>
                      {propertyType || 'Select property type'}
                    </Text>
                    <Ionicons name={showPropertyDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
                  </TouchableOpacity>
                  {showPropertyDropdown && (
                    <View style={styles.dropdownPanel}>
                      {PROPERTY_TYPES.map((p) => {
                        const active = propertyType === p;
                        return (
                          <TouchableOpacity
                            key={p}
                            style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                            onPress={() => { setPropertyType(p); setShowPropertyDropdown(false); }}
                          >
                            <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{p}</Text>
                            {active && <Ionicons name="checkmark" size={16} color="#1E3A8A" />}
                          </TouchableOpacity>
                        );
                      })}
                      {!!propertyType && (
                        <TouchableOpacity style={styles.dropdownClear} onPress={() => { setPropertyType(''); setShowPropertyDropdown(false); }}>
                          <Ionicons name="close" size={14} color="#6B7280" />
                          <Text style={styles.dropdownClearText}>Clear selection</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionLabel}>
                  <Ionicons name="people" size={16} color="#10B981" />
                  <Text style={styles.filterSectionLabelText}>Occupant Type</Text>
                </View>
                <View style={styles.bedroomsRow}>
                  {(['Family','Individual'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.badge, occupantType === t && styles.badgeActive]} onPress={() => setOccupantType(prev => prev === t ? '' as any : t)}>
                      <Text style={[styles.badgeText, occupantType === t && styles.badgeTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSecondary]} 
                onPress={clearAll}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonSecondaryText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={() => setShowFilters(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonPrimaryText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    width: '100%',
  },
  searchContainer: {
    width: '100%',
    margin: 0,
    padding: 0,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.select({ ios: 12, android: 10, default: 11 }),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
    fontWeight: '400',
  },
  clearInputBtn: {
    marginLeft: 6,
    padding: 2,
  },
  clearButtonCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981',
    position: 'relative',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowOpacity: 0.25,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  activeIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  resetButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  resetButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  filters: {
    marginTop: 4,
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  filterField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  filterFieldGrow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  filterInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  filterSection: {
    gap: 10,
    marginTop: 16,
  },
  filterSectionFirst: {
    gap: 10,
    marginTop: 0,
  },
  filterSectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  filterSectionLabelText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  toText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  bedroomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  barangayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    shadowOpacity: 0.08,
  },
  badgeText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  badgeTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#ECFEFF',
    borderColor: '#A5F3FC',
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#0E7490',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    width: '100%',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.3,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectDisplayText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dropdownPanel: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#EEF2FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  dropdownItemTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  dropdownClear: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownClearText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  modalButtonPrimary: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  modalButtonSecondaryText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});


