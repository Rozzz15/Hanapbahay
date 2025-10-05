import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedView } from '@/components/common';
import { ThemedText } from '@/components/common';
import { PropertyInfoData, PROPERTY_TYPES, RENTAL_TYPES, LEASE_TERMS } from '@/types/property';

interface PropertyInfoSectionProps {
  data: PropertyInfoData;
  onUpdate: (data: Partial<PropertyInfoData>) => void;
}

export default function PropertyInfoSection({ data, onUpdate }: PropertyInfoSectionProps) {
  const availabilityOptions = [
    { id: 'available', label: 'Available' },
    { id: 'occupied', label: 'Occupied' },
    { id: 'reserved', label: 'Reserved' }
  ];

  const selectPropertyType = (propertyType: string) => {
    // Single selection - replace current selection
    onUpdate({ propertyType: data.propertyType === propertyType ? '' : propertyType });
  };

  const selectRentalType = (rentalType: string) => {
    // Single selection - replace current selection
    onUpdate({ rentalType: data.rentalType === rentalType ? '' : rentalType });
  };

  const selectAvailabilityStatus = (status: string) => {
    // Single selection - replace current selection
    onUpdate({ availabilityStatus: status as any });
  };

  const selectLeaseTerm = (term: string) => {
    // Single selection - replace current selection
    onUpdate({ leaseTerm: term as any });
  };

  return (
    <ScrollView className="flex-1">
      {/* Auto-population notification */}
      {(data.propertyType || data.monthlyRent > 0) && (
        <ThemedView className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
          <Text className="text-green-800 font-medium mb-2">
            ✅ Property information pre-populated from your account
          </Text>
          <Text className="text-green-700 text-sm">
            Your property preferences from registration have been automatically applied. 
            You can modify any fields as needed.
          </Text>
        </ThemedView>
      )}
      
      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <ThemedText type="subtitle">Property Type</ThemedText>
          {data.propertyType && <Text className="text-green-600 text-sm font-medium">✓ Pre-selected</Text>}
        </View>
        <View className="flex-row flex-wrap">
          {PROPERTY_TYPES.map((propertyType) => (
            <TouchableOpacity
              key={propertyType}
              onPress={() => selectPropertyType(propertyType)}
              className={`mr-2 mb-2 px-4 py-3 rounded-full border ${
                data.propertyType === propertyType
                  ? 'bg-green-100 border-green-500 shadow-sm ring-2 ring-green-200'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <Text className={`text-sm font-medium ${
                data.propertyType === propertyType
                  ? 'text-green-700'
                  : 'text-gray-600'
              }`}>
                {propertyType}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <ThemedText type="subtitle">Rental Type</ThemedText>
          {data.rentalType && <Text className="text-green-600 text-sm font-medium">✓ Pre-selected</Text>}
        </View>
        <View className="flex-row flex-wrap">
          {RENTAL_TYPES.map((rentalType) => (
            <TouchableOpacity
              key={rentalType}
              onPress={() => selectRentalType(rentalType)}
              className={`mr-2 mb-2 px-4 py-3 rounded-full border ${
                data.rentalType === rentalType
                  ? 'bg-green-100 border-green-500 shadow-sm ring-2 ring-green-200'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <Text className={`text-sm font-medium ${
                data.rentalType === rentalType
                  ? 'text-green-700'
                  : 'text-gray-600'
              }`}>
                {rentalType}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <ThemedText type="subtitle">Rental Rates</ThemedText>
          {data.monthlyRent > 0 && <Text className="text-green-600 text-sm font-medium">✓ Pre-filled</Text>}
        </View>
        
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Monthly Rent (₱)</Text>
          <TextInput
            value={data.monthlyRent.toString()}
            onChangeText={(text) => onUpdate({ monthlyRent: parseFloat(text) || 0 })}
            placeholder="Enter monthly rent"
            keyboardType="numeric"
            className={`border rounded-lg px-3 py-3 text-gray-800 font-medium ${
              data.monthlyRent > 0 
                ? 'border-green-400 bg-green-50 shadow-sm ring-2 ring-green-200' 
                : 'border-gray-300'
            }`}
          />
        </View>

      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Availability Status</ThemedText>
        <View className="flex-row flex-wrap">
          {availabilityOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => selectAvailabilityStatus(option.id)}
              className={`mr-2 mb-2 px-4 py-3 rounded-full border ${
                data.availabilityStatus === option.id
                  ? 'bg-green-100 border-green-500 shadow-sm ring-2 ring-green-200'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <Text className={`text-sm font-medium ${
                data.availabilityStatus === option.id
                  ? 'text-green-700'
                  : 'text-gray-600'
              }`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Lease Term</ThemedText>
        <View className="flex-row flex-wrap">
          {LEASE_TERMS.map((leaseTerm) => (
            <TouchableOpacity
              key={leaseTerm}
              onPress={() => selectLeaseTerm(leaseTerm)}
              className={`mr-2 mb-2 px-4 py-3 rounded-full border ${
                data.leaseTerm === leaseTerm
                  ? 'bg-green-100 border-green-500 shadow-sm ring-2 ring-green-200'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <Text className={`text-sm font-medium ${
                data.leaseTerm === leaseTerm
                  ? 'text-green-700'
                  : 'text-gray-600'
              }`}>
                {leaseTerm}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>
    </ScrollView>
  );
}
