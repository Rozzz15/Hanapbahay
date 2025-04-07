import React from 'react';
import { Input, InputField, InputIcon } from './ui/input';
import { SearchIcon } from './ui/icon';
import { View } from 'react-native';

interface LocationSearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
}

const LocationSearchBar: React.FC<LocationSearchBarProps> = ({ 
  placeholder = "Search address, city, location",
  onSearch 
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
      </Input>
    </View>
  );
};

export default LocationSearchBar; 