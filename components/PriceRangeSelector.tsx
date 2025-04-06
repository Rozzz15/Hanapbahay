import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { PriceRange } from '../utils/mockData';
import { HStack } from '../components/ui/hstack';

interface PriceRangeSelectorProps {
  priceRange: PriceRange;
  onRangeChange: (range: PriceRange) => void;
}

const PriceRangeSelector: React.FC<PriceRangeSelectorProps> = ({
  priceRange,
  onRangeChange,
}) => {
  const [minInput, setMinInput] = useState(priceRange.min.toString());
  const [maxInput, setMaxInput] = useState(priceRange.max.toString());
  const [minError, setMinError] = useState<string | null>(null);
  const [maxError, setMaxError] = useState<string | null>(null);

  useEffect(() => {
    setMinInput(priceRange.min.toString());
    setMaxInput(priceRange.max.toString());
  }, [priceRange]);

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString()}`;
  };

  const validateMin = (value: string): boolean => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setMinError('Please enter a valid number');
      return false;
    }
    if (numValue < 0) {
      setMinError('Price cannot be negative');
      return false;
    }
    if (numValue > parseInt(maxInput, 10)) {
      setMinError('Min price cannot be greater than max price');
      return false;
    }
    setMinError(null);
    return true;
  };

  const validateMax = (value: string): boolean => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setMaxError('Please enter a valid number');
      return false;
    }
    if (numValue < 0) {
      setMaxError('Price cannot be negative');
      return false;
    }
    if (numValue < parseInt(minInput, 10)) {
      setMaxError('Max price cannot be less than min price');
      return false;
    }
    setMaxError(null);
    return true;
  };

  const handleMinChange = (text: string) => {
    setMinInput(text);
    if (validateMin(text)) {
      onRangeChange({ ...priceRange, min: parseInt(text, 10) });
    }
  };

  const handleMaxChange = (text: string) => {
    setMaxInput(text);
    if (validateMax(text)) {
      onRangeChange({ ...priceRange, max: parseInt(text, 10) });
    }
  };

  return (
    <View className="mb-8">
      <Text className="text-lg font-semibold mb-3">Price range</Text>
      <Text className="text-base mb-6">
        {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}+ / month
      </Text>
      
      <HStack className="space-x-6 gap-4">
        <View className="flex-1">
          <Text className="text-sm text-gray-600">Min Price</Text>
          <TextInput
            className="border border-gray-300 rounded-full p-3 mt-1"
            keyboardType="numeric"
            value={minInput}
            onChangeText={handleMinChange}
            placeholder="Min price"
          />
          {minError && <Text className="text-red-500 text-xs mt-2">{minError}</Text>}
        </View>
        
        <View className="flex-1">
          <Text className="text-sm text-gray-600">Max Price</Text>
          <TextInput
            className="border border-gray-300 rounded-full p-3 mt-1"
            keyboardType="numeric"
            value={maxInput}
            onChangeText={handleMaxChange}
            placeholder="Max price"
          />
          {maxError && <Text className="text-red-500 text-xs mt-2">{maxError}</Text>}
        </View>
      </HStack>
    </View>
  );
};

export default PriceRangeSelector; 