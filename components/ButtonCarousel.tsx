import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export interface ButtonOption {
  id: string;
  label: string;
}

interface ButtonCarouselProps {
  options: ButtonOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  defaultSelectedId?: string;
}

export default function ButtonCarousel({ 
  options,
  selectedId,
  onSelect,
  defaultSelectedId
}: ButtonCarouselProps) {
  
  // Set default selected if provided and no selection yet
  React.useEffect(() => {
    if (defaultSelectedId && !selectedId) {
      onSelect(defaultSelectedId);
    }
  }, [defaultSelectedId, selectedId, onSelect]);

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 8,
        gap: 8,
      }}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          onPress={() => onSelect(option.id)}
          style={{
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 9999,
            backgroundColor: selectedId === option.id ? '#22C55E' : '#F3F4F6',
            shadowColor: selectedId === option.id ? 'rgba(34, 197, 94, 0.5)' : 'transparent',
            shadowOffset: selectedId === option.id ? { width: 0, height: 1 } : { width: 0, height: 0 },
            shadowOpacity: selectedId === option.id ? 0.5 : 0,
            shadowRadius: selectedId === option.id ? 2 : 0,
            elevation: selectedId === option.id ? 2 : 0,
          }}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '500',
            color: selectedId === option.id ? '#FFFFFF' : '#374151',
          }}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
} 