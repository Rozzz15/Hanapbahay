import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, Pressable } from 'react-native';

export interface ButtonOption {
  id: string;
  label: string;
}

interface ButtonCarouselProps {
  options: ButtonOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  defaultSelectedValue?: string;
  isPreSelected?: boolean; // Indicates if this comes from user preferences
}

export default function ButtonCarousel({ 
  options,
  selectedValue,
  onSelect,
  defaultSelectedValue,
  isPreSelected = false
}: ButtonCarouselProps) {
  
  // Set default selected if provided and no selection yet
  React.useEffect(() => {
    if (defaultSelectedValue && !selectedValue) {
      onSelect(defaultSelectedValue);
    }
  }, [defaultSelectedValue, selectedValue, onSelect]);

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 8,
        gap: 8,
      }}
    >
      {options.map((option) => {
        const isSelected = selectedValue === option.id;
        const isPreSelectedItem = isPreSelected && isSelected;
        
        return (
          <TouchableOpacity
            selectable={false}
            key={option.id}
            onPress={() => {
              console.log(`🔘 ButtonCarousel: Selected ${option.label} (${option.id})`);
              onSelect(option.id);
            }}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 9999,
              backgroundColor: isSelected ? '#059669' : '#F3F4F6',
              borderWidth: isSelected ? 3 : 1,
              borderColor: isSelected ? '#047857' : '#D1D5DB',
              shadowColor: isSelected ? 'rgba(5, 150, 105, 0.6)' : 'transparent',
              shadowOffset: isSelected ? { width: 0, height: 6 } : { width: 0, height: 0 },
              shadowOpacity: isSelected ? 1 : 0,
              shadowRadius: isSelected ? 12 : 0,
              elevation: isSelected ? 8 : 0,
              transform: isSelected ? [{ scale: 1.15 }] : [{ scale: 1 }],
              opacity: isSelected ? 1 : 0.8,
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: isSelected ? '800' : '400',
              color: isSelected ? '#FFFFFF' : '#6B7280',
              textShadowColor: isSelected ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
              textShadowOffset: isSelected ? { width: 0, height: 2 } : { width: 0, height: 0 },
              textShadowRadius: isSelected ? 2 : 0,
            }}>
              {option.label}
              {isPreSelectedItem && ' ✨'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
} 