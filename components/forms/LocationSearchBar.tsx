import React from 'react';
import { Input, InputField, InputIcon, InputSlot } from '../ui/input';
import { SearchIcon } from '../ui/icon';
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
    <Input 
      size="xl" 
      variant="rounded"
      className="bg-white border-2 border-gray-200 focus:border-green-500 rounded-2xl shadow-lg"
    >
      <InputIcon 
        as={SearchIcon} 
        className="text-green-600 ml-4" 
      />
      <InputField
        id="location-search"
        placeholder={placeholder}
        onChangeText={onSearch}
        className="pl-3 text-lg font-medium"
        placeholderTextColor="#6b7280"
      />
      <InputSlot>
        <Pressable 
          className="bg-green-100 p-3 rounded-xl mr-2"
          onPress={onFilterPress}
        >
          <Filter size={20} color="#16a34a" />
        </Pressable>
      </InputSlot>
    </Input>
  );
};

export default LocationSearchBar; 