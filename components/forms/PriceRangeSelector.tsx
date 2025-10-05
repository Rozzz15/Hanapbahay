import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { PriceRange } from '../../utils/mockData';
import { HStack } from '../ui/hstack';

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
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 12 }}>
        Price Range
      </Text>
      <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 24 }}>
        {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}+ / month
      </Text>
      
      <HStack className="space-x-6 gap-4">
        <View className="flex-1">
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            Min Price
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 25,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: '#111827',
              backgroundColor: '#ffffff',
            }}
            keyboardType="numeric"
            value={minInput}
            onChangeText={handleMinChange}
            placeholder="Min price"
            placeholderTextColor="#9ca3af"
          />
          {minError && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
              {minError}
            </Text>
          )}
        </View>
        
        <View className="flex-1">
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            Max Price
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 25,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: '#111827',
              backgroundColor: '#ffffff',
            }}
            keyboardType="numeric"
            value={maxInput}
            onChangeText={handleMaxChange}
            placeholder="Max price"
            placeholderTextColor="#9ca3af"
          />
          {maxError && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
              {maxError}
            </Text>
          )}
        </View>
      </HStack>
    </View>
  );
};

export default PriceRangeSelector; 