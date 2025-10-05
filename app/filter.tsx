import React, { useState } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { ThemedText } from '@components/common';
import { SafeAreaView } from 'react-native';
import { PriceRangeSelector, CountSelect, ButtonCarousel } from '@components/forms';
import { InteractiveButton } from '@components/buttons';
import { VStack } from '@components/ui/vstack';
import { PriceRange } from '@utils';
import type { ButtonOption } from '@types';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';

const propertyTypes: ButtonOption[] = [
  { id: 'any', label: 'Any' },
  { id: 'house', label: 'House' },
  { id: 'studio', label: 'Studio' },
  { id: 'cabin', label: 'Cabin' },
  { id: 'apartment', label: 'Apartment' }
];

export default function FilterScreen() {
  const router = useRouter();
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 1000, max: 5000 });
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('any');

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Enhanced Header */}
      <View className="bg-white shadow-sm border-b border-gray-200">
        <View className="flex-row items-center px-4 py-4">
          <Pressable 
            onPress={() => router.back()}
            className="mr-3 p-2 bg-gray-100 rounded-full"
          >
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
            Filters
          </Text>
        </View>
      </View>
      
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <VStack className="space-y-6">
          <View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 12 }}>
              Property Type
            </Text>
            <ButtonCarousel
              options={propertyTypes}
              selectedId={selectedPropertyType}
              onSelect={setSelectedPropertyType}
              defaultSelectedId="any"
            />
          </View>

          <PriceRangeSelector
            priceRange={priceRange}
            onRangeChange={setPriceRange}
          />

          <CountSelect
            label="Bedrooms"
            value={bedrooms}
            onChange={setBedrooms}
          />

          <CountSelect
            label="Bathrooms"
            value={bathrooms}
            onChange={setBathrooms}
          />

          <VStack className='mt-8 w-full items-center'>
            <InteractiveButton
              text="Apply Filters"
              onPress={() => {
                // Handle filter application
                const filters = { 
                  propertyType: selectedPropertyType, 
                  priceRange, 
                  bedrooms, 
                  bathrooms 
                };
                console.log('Applying filters:', filters);
                
                // Navigate back to dashboard with filters applied
                router.back();
              }}
              variant="primary"
              size="lg"
              fullWidth={true}
            />
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 