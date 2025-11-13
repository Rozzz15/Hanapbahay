import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BARANGAYS } from '@/constants/Barangays';
import { AMENITIES, PROPERTY_TYPES } from '@/types/property';
import { SmartSearchParams, debounce } from '@/utils/search';

type Props = {
  value: SmartSearchParams;
  onChange: (params: SmartSearchParams) => void;
};

export default function TenantSmartSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState<string>(value.query || '');
  const [locationText, setLocationText] = useState<string>(value.location || '');
  const [minPrice, setMinPrice] = useState<string>(value.minPrice ? String(value.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState<string>(value.maxPrice ? String(value.maxPrice) : '');
  const [rooms, setRooms] = useState<number>(value.rooms || value.bedrooms || 0);
  const [amenities, setAmenities] = useState<string[]>(value.amenities || []);
  const [propertyType, setPropertyType] = useState<string>(value.propertyType || '');
  const [occupantType, setOccupantType] = useState<'Family' | 'Individual' | ''>((value as any).occupantType || '');
  const [popular, setPopular] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showBarangayDropdown, setShowBarangayDropdown] = useState<boolean>(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState<boolean>(false);

  const debouncedEmit = useRef(
    debounce((params: SmartSearchParams) => onChange(params), 300)
  ).current;

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
    setLocationText('');
    setMinPrice('');
    setMaxPrice('');
    setRooms(0);
    setAmenities([]);
    onChange({});
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search rentals (e.g., studio, parking, near school)"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            returnKeyType="search"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShowFilters(v => !v)}
          style={styles.clearBtn}
        >
          <Ionicons name="options" size={18} color="#1E3A8A" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={clearAll} style={styles.clearBtn}>
          <Ionicons name="refresh" size={18} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {showFilters && (
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowFilters(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.filters}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="location" size={16} color="#6B7280" />
            <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Barangay</Text>
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

              <View style={{ gap: 8, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="home" size={16} color="#6B7280" />
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Property Type</Text>
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

              <View style={{ gap: 8, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="people" size={16} color="#6B7280" />
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Family or Individual Type</Text>
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
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[styles.clearBtn, { flex: 1, backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]} onPress={clearAll}>
                <Text style={{ color: '#1E3A8A', fontWeight: '700' }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.clearBtn, { flex: 1, backgroundColor: '#059669', borderColor: '#059669' }]} onPress={() => setShowFilters(false)}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Apply</Text>
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
    paddingHorizontal: 16,
    marginTop: 12,
  },
  row: {
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
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 8, default: 10 }),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  
  filters: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterFieldGrow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  toText: {
    fontSize: 12,
    color: '#6B7280',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  badgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#1E3A8A',
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
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    width: '100%',
    borderTopWidth: 1,
    borderColor: '#E5E7EB'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827'
  },
  selectDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectDisplayText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  dropdownPanel: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  },
  dropdownItemTextActive: {
    color: '#1E3A8A',
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
  },
});


