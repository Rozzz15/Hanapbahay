import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@components/ThemedText';
import { ThemedView } from '@components/ThemedView';
import { SafeAreaView } from 'react-native';
import PriceRangeSelector from '@components/PriceRangeSelector';
import CountSelect from '@components/CountSelect';
import { GradientButton } from '@components/GradientButton';
import { VStack } from '@components/ui/vstack';
import { PriceRange } from '@utils/mockData';
import ButtonCarousel, { ButtonOption } from '@components/ButtonCarousel';
import { Button } from '@components/ui/button';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import LocationSearchBar from '@components/LocationSearchBar';

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
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-row items-center px-4 py-2 border-b border-gray-200 mt-10">
        <Pressable 
          onPress={() => router.back()}
          className="mr-2 p-2"
        >
          <ArrowLeft size={24} color="#374151" />
        </Pressable>
      </View>
      <ScrollView className="flex-1 p-4">
        <VStack className="space-y-6">
          <ThemedText className="text-2xl font-bold mb-4">Filters</ThemedText>
          
          <View>
            <ThemedText className="text-lg font-semibold mb-3">Property Type</ThemedText>
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
            onChange={setBedrooms}
          />

          <CountSelect
            label="Bathrooms"
            onChange={setBathrooms}
          />

          <GradientButton
            text="Apply Filters"
            onPress={() => {
              // Handle filter application
              console.log('Applying filters:', { 
                propertyType: selectedPropertyType, 
                priceRange, 
                bedrooms, 
                bathrooms 
              });
            }}
          />
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 