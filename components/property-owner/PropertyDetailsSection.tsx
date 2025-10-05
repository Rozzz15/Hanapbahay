import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedView } from '@/components/common';
import { ThemedText } from '@/components/common';
import { CountSelect } from '@/components/forms';
import { PropertyDetailsData, AMENITIES } from '@/types/property';
import { Check, X } from 'lucide-react-native';

interface PropertyDetailsSectionProps {
  data: PropertyDetailsData;
  onUpdate: (data: Partial<PropertyDetailsData>) => void;
}

export default function PropertyDetailsSection({ data, onUpdate }: PropertyDetailsSectionProps) {
  const [newRule, setNewRule] = useState('');

  const addRule = () => {
    if (newRule.trim()) {
      onUpdate({ rules: [...data.rules, newRule.trim()] });
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    const updatedRules = data.rules.filter((_, i) => i !== index);
    onUpdate({ rules: updatedRules });
  };

  const toggleAmenity = (amenity: string) => {
    const updatedAmenities = data.amenities.includes(amenity)
      ? data.amenities.filter(a => a !== amenity)
      : [...data.amenities, amenity];
    onUpdate({ amenities: updatedAmenities });
  };

  return (
    <ScrollView className="flex-1">
      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Property Address / Location</ThemedText>
        <TextInput
          value={data.address}
          onChangeText={(text) => onUpdate({ address: text })}
          placeholder="Enter property location"
          multiline
          className="border-2 border-gray-300 bg-gray-50 rounded-lg px-3 py-3 text-gray-800 text-base min-h-[80px]"
        />
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Property Specifications</ThemedText>
        

      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Amenities</ThemedText>
        <View className="flex-row flex-wrap">
          {AMENITIES.map((amenity) => (
            <TouchableOpacity
              key={amenity}
              onPress={() => toggleAmenity(amenity)}
              className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                data.amenities.includes(amenity)
                  ? 'bg-green-100 border-green-500'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <Text className={`text-sm ${
                data.amenities.includes(amenity)
                  ? 'text-green-700 font-medium'
                  : 'text-gray-600'
              }`}>
                {amenity}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">House Rules</ThemedText>
        
        <View className="flex-row space-x-2 mb-4">
          <TextInput
            value={newRule}
            onChangeText={setNewRule}
            placeholder="Add a house rule"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-gray-800"
          />
          <TouchableOpacity
            onPress={addRule}
            className="bg-green-500 px-4 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Add</Text>
          </TouchableOpacity>
        </View>

        <View className="space-y-2">
          {data.rules.map((rule, index) => (
            <View key={index} className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg">
              <Text className="flex-1 text-gray-800">{rule}</Text>
              <TouchableOpacity
                onPress={() => removeRule(index)}
                className="ml-2 p-1"
              >
                <X size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ThemedView>
    </ScrollView>
  );
}
