import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { DateRange } from '../utils/mockData';

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateChange: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ dateRange, onDateChange }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold mb-2">How long do you want to stay?</Text>
      <Pressable 
        className="bg-gray-100 p-4 rounded-xl flex-row justify-between items-center"
        onPress={() => {
          // Here you would typically open a date picker
          console.log('Open date picker');
        }}
      >
        <View className="flex-row items-center">
          <Text className="text-base">
            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

export default DateRangePicker; 