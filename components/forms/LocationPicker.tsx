import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, Alert, TextInput } from 'react-native';
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
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
          <Text className="text-xl font-semibold">Select Location</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="p-4 bg-gray-50 border-b border-gray-200">
          <View className="flex-row items-center bg-white rounded-xl border border-gray-300 px-4 py-3">
            <Search size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-3 text-base"
              placeholder="Search for a location..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus={true}
            />
            {isLoading && (
              <View className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
          </View>
        </View>

        {/* Search Results */}
        <View className="flex-1 bg-white">
          {searchResults.length > 0 ? (
            <View className="p-4">
              <Text className="text-sm font-medium text-gray-600 mb-3">Search Results:</Text>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleLocationSelect(result)}
                  className="p-4 border-b border-gray-100 active:bg-gray-50"
                >
                  <View className="flex-row items-start">
                    <MapPin size={16} color="#6B7280" className="mt-1" />
                    <View className="ml-3 flex-1">
                      <Text className="font-medium text-gray-800">
                        {result.name || result.formatted}
                      </Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        {result.locality}, {result.principalSubdivision}, Philippines
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : searchQuery.length >= 3 && !isLoading ? (
            <View className="flex-1 justify-center items-center p-8">
              <MapPin size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4">
                No locations found for "{searchQuery}"
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2">
                Try a different search term or use the manual option below
              </Text>
            </View>
          ) : (
            <View className="flex-1 justify-center items-center p-8">
              <MapPin size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4">
                Search for your location
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2">
                Type at least 3 characters to search
              </Text>
            </View>
          )}
        </View>

        {/* Selected Location Display */}
        {selectedLocation && (
          <View className="p-4 bg-green-50 border-t border-green-200">
            <View className="flex-row items-center">
              <Check size={16} color="#10B981" />
              <Text className="text-green-800 font-medium ml-2">Selected Location:</Text>
            </View>
            <Text className="text-green-700 text-sm mt-1">{selectedLocation.address}</Text>
            <Text className="text-green-600 text-xs mt-1">
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View className="p-4 bg-white border-t border-gray-200">
          <VStack className="space-y-3">
            <TouchableOpacity
              onPress={handleConfirmLocation}
              disabled={!selectedLocation}
              className={`py-4 px-6 rounded-xl ${
                selectedLocation
                  ? 'bg-green-600 active:opacity-90'
                  : 'bg-gray-300'
              }`}
            >
              <Text className={`text-center font-semibold text-lg ${
                selectedLocation ? 'text-white' : 'text-gray-500'
              }`}>
                Confirm Location
              </Text>
            </TouchableOpacity>
            
            {searchQuery.trim() && !selectedLocation && (
              <TouchableOpacity
                onPress={handleManualLocation}
                className="py-3 px-6 rounded-xl border-2 border-blue-300 bg-blue-50"
              >
                <Text className="text-center font-medium text-blue-600">
                  Use "{searchQuery}" as Location
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={onClose}
              className="py-3 px-6 rounded-xl border-2 border-gray-300"
            >
              <Text className="text-center font-medium text-gray-600">
                Cancel
              </Text>
            </TouchableOpacity>
          </VStack>
        </View>
      </View>
    </Modal>
  );
};

export default LocationPicker;
