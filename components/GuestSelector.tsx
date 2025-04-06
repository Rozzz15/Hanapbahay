import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GuestCategory {
  label: string;
  count: number;
}

interface GuestSelectorProps {
  guests: {
    adults: number;
    children: number;
    infants: number;
  };
  onGuestChange: (category: string, value: number) => void;
}

const GuestSelector: React.FC<GuestSelectorProps> = ({ guests, onGuestChange }) => {
  const renderCounter = (label: string, count: number, category: string) => (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-base">{label}</Text>
      <View className="flex-row items-center space-x-4">
        <Pressable
          onPress={() => onGuestChange(category, Math.max(0, count - 1))}
          className={`rounded-full w-8 h-8 items-center justify-center border border-gray-300 
            ${count === 0 ? 'opacity-50' : ''}`}
          disabled={count === 0}
        >
          <Ionicons name="remove" size={20} color="#374151" />
        </Pressable>
        <Text className="text-base w-6 text-center">{count}</Text>
        <Pressable
          onPress={() => onGuestChange(category, count + 1)}
          className="rounded-full w-8 h-8 items-center justify-center border border-gray-300"
        >
          <Ionicons name="add" size={20} color="#374151" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold mb-2">How many guests coming?</Text>
      {renderCounter('Adults', guests.adults, 'adults')}
      {renderCounter('Children', guests.children, 'children')}
      {renderCounter('Infants', guests.infants, 'infants')}
    </View>
  );
};

export default GuestSelector; 