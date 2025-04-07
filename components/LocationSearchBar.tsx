import React from 'react';
import { Input, InputField, InputIcon, InputSlot } from './ui/input';
import { SearchIcon } from './ui/icon';
import { View, Pressable } from 'react-native';
import { Filter } from 'lucide-react-native';

interface LocationSearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  onFilterPress?: () => void;
}

const LocationSearchBar: React.FC<LocationSearchBarProps> = ({ 
  placeholder = "Search address, city, location",
  onSearch,
  onFilterPress
}) => {
  return (
    <View className="px-2 py-2">
      <Input 
        size="xl" 
        variant="rounded"
        className="bg-gray-50 shadow-sm"
      >
        <InputIcon 
          as={SearchIcon} 
          className="text-gray-400 ml-4" 
        />
        <InputField
          placeholder={placeholder}
          onChangeText={onSearch}
          className="pl-3 text-base"
          placeholderTextColor="#9CA3AF"
        />
        <InputSlot>
          <Pressable 
            className="pr-4"
            onPress={onFilterPress}
          >
            <Filter size={24} color="#374151" />
          </Pressable>
        </InputSlot>
      </Input>
    </View>
  );
};

export default LocationSearchBar; 