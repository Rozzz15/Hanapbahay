import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, Pressable } from 'react-native';

export interface ButtonOption {
  id: string;
  label: string;
}

interface ButtonCarouselProps {
  options: ButtonOption[];
  selectedId: string;
  onSelect: (value: string) => void;
  defaultSelectedId?: string;
  isPreSelected?: boolean; // Indicates if this comes from user preferences
}

export default function ButtonCarousel({ 
  options,
  selectedId,
  onSelect,
  defaultSelectedId,
  isPreSelected = false
}: ButtonCarouselProps) {
  
  // Set default selected if provided and no selection yet
  React.useEffect(() => {
    if (defaultSelectedId && !selectedId) {
      onSelect(defaultSelectedId);
    }
  }, [defaultSelectedId, selectedId, onSelect]);

  return (
    <View style={{ marginBottom: 8 }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 2,
          gap: 8,
        }}
      >
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const isPreSelectedItem = isPreSelected && isSelected;
          
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => {
                console.log(`🔘 ButtonCarousel: Selected ${option.label} (${option.id})`);
                onSelect(option.id);
              }}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: isSelected ? '#3B82F6' : '#FFFFFF',
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? '#1D4ED8' : '#E5E7EB',
                boxShadow: isSelected ? '0 4px 8px rgba(59, 130, 246, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                elevation: isSelected ? 6 : 1,
                transform: isSelected ? [{ scale: 1.05 }] : [{ scale: 1 }],
                opacity: isSelected ? 1 : 0.95,
                minWidth: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{
                fontSize: 15,
                fontWeight: isSelected ? '700' : '500',
                color: isSelected ? '#FFFFFF' : '#374151',
                textAlign: 'center',
                letterSpacing: 0.3,
              }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
} 