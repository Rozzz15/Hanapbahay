import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, Alert, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { X, MapPin, Check, Search } from 'lucide-react-native';

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  currentLocation?: { latitude: number; longitude: number; address: string } | null;
  visible: boolean;
  onClose: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  currentLocation,
  visible,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(currentLocation || null);

  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Update when currentLocation changes
  useEffect(() => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
      setSearchQuery(currentLocation.address);
    }
  }, [currentLocation]);

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      // Using a simple geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/forward-geocode-client?query=${encodeURIComponent(query)}&localityLanguage=en&limit=5`
      );
      const data = await response.json();
      
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchLocations(text);
  };

  const handleLocationSelect = (result: any) => {
    const locationData = {
      latitude: parseFloat(result.latitude),
      longitude: parseFloat(result.longitude),
      address: result.formatted || `${result.name}, ${result.locality}, Philippines`
    };
    
    setSelectedLocation(locationData);
    setSearchQuery(locationData.address);
    setSearchResults([]);
  };

  const handleConfirmLocation = () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please search and select a location.');
      return;
    }

    onLocationSelect(selectedLocation);
    onClose();
  };

  const handleManualLocation = () => {
    if (searchQuery.trim()) {
      const locationData = {
        latitude: 14.5995, // Default Manila coordinates
        longitude: 120.9842,
        address: searchQuery.trim()
      };
      
      setSelectedLocation(locationData);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text size="xl" bold style={styles.headerText}>Select Location</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a location..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus={true}
            />
            {isLoading && (
              <ActivityIndicator size="small" color="#2563EB" />
            )}
          </View>
        </View>

        {/* Search Results */}
        <View style={styles.resultsContainer}>
          {searchResults.length > 0 ? (
            <View style={styles.resultsList}>
              <Text size="sm" bold style={styles.resultsTitle}>Search Results:</Text>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleLocationSelect(result)}
                  style={styles.resultItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultContent}>
                    <MapPin size={16} color="#6B7280" style={styles.resultIcon} />
                    <View style={styles.resultTextContainer}>
                      <Text bold style={styles.resultName}>
                        {result.name || result.formatted}
                      </Text>
                      <Text size="sm" style={styles.resultLocation}>
                        {result.locality}, {result.principalSubdivision}, Philippines
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : searchQuery.length >= 3 && !isLoading ? (
            <View style={styles.emptyState}>
              <MapPin size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                No locations found for &quot;{searchQuery}&quot;
              </Text>
              <Text size="sm" style={styles.emptySubtext}>
                Try a different search term or use the manual option below
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MapPin size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                Search for your location
              </Text>
              <Text size="sm" style={styles.emptySubtext}>
                Type at least 3 characters to search
              </Text>
            </View>
          )}
        </View>

        {/* Selected Location Display */}
        {selectedLocation && (
          <View style={styles.selectedContainer}>
            <View style={styles.selectedHeader}>
              <Check size={16} color="#10B981" />
              <Text bold style={styles.selectedLabel}>Selected Location:</Text>
            </View>
            <Text size="sm" style={styles.selectedAddress}>{selectedLocation.address}</Text>
            <Text size="2xs" style={styles.selectedCoordinates}>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <VStack space="sm">
            <TouchableOpacity
              onPress={handleConfirmLocation}
              disabled={!selectedLocation}
              style={[
                styles.confirmButton,
                !selectedLocation && styles.confirmButtonDisabled
              ]}
              activeOpacity={0.8}
            >
              <Text bold size="lg" style={[
                styles.confirmButtonText,
                !selectedLocation && styles.confirmButtonTextDisabled
              ]}>
                Confirm Location
              </Text>
            </TouchableOpacity>
            
            {searchQuery.trim() && !selectedLocation && (
              <TouchableOpacity
                onPress={handleManualLocation}
                style={styles.manualButton}
                activeOpacity={0.8}
              >
                <Text bold style={styles.manualButtonText}>
                  Use &quot;{searchQuery}&quot; as Location
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              activeOpacity={0.8}
            >
              <Text bold style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </VStack>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  resultsList: {
    padding: 16,
  },
  resultsTitle: {
    color: '#4B5563',
    marginBottom: 12,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resultIcon: {
    marginTop: 2,
  },
  resultTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    color: '#111827',
  },
  resultLocation: {
    color: '#4B5563',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  selectedContainer: {
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLabel: {
    color: '#065F46',
    marginLeft: 8,
  },
  selectedAddress: {
    color: '#047857',
    marginTop: 4,
  },
  selectedCoordinates: {
    color: '#059669',
    marginTop: 4,
  },
  actionsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmButtonText: {
    textAlign: 'center',
    color: '#FFFFFF',
  },
  confirmButtonTextDisabled: {
    color: '#6B7280',
  },
  manualButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#93C5FD',
    backgroundColor: '#DBEAFE',
  },
  manualButtonText: {
    textAlign: 'center',
    color: '#2563EB',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#4B5563',
  },
});

export default LocationPicker;
