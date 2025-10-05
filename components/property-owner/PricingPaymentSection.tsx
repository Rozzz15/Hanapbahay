import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedView } from '@/components/common';
import { ThemedText } from '@/components/common';
import { PricingPaymentData, PAYMENT_METHODS } from '@/types/property';
import { Check } from 'lucide-react-native';

interface PricingPaymentSectionProps {
  data: PricingPaymentData;
  onUpdate: (data: Partial<PricingPaymentData>) => void;
}

export default function PricingPaymentSection({ data, onUpdate }: PricingPaymentSectionProps) {
  const togglePaymentMethod = (method: string) => {
    const updatedMethods = data.paymentMethods.includes(method)
      ? data.paymentMethods.filter(m => m !== method)
      : [...data.paymentMethods, method];
    onUpdate({ paymentMethods: updatedMethods });
  };

  return (
    <ScrollView className="flex-1">

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Security Deposit (Optional)</ThemedText>
        
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Security Deposit (₱)</Text>
          <TextInput
            value={data.securityDeposit.toString()}
            onChangeText={(text) => onUpdate({ securityDeposit: parseFloat(text) || 0 })}
            placeholder="Enter security deposit amount (optional)"
            keyboardType="numeric"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800"
          />
          <Text className="text-xs text-gray-500 mt-1">
            Usually 1-2 months rent. Optional - leave empty if no deposit required.
          </Text>
        </View>
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Accepted Payment Methods</ThemedText>
        
        <View className="space-y-3">
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              onPress={() => togglePaymentMethod(method)}
              className={`flex-row items-center justify-between p-3 rounded-lg border ${
                data.paymentMethods.includes(method)
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`font-medium ${
                data.paymentMethods.includes(method)
                  ? 'text-green-700'
                  : 'text-gray-700'
              }`}>
                {method}
              </Text>
              
              {data.paymentMethods.includes(method) && (
                <Check size={20} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {data.paymentMethods.length > 0 && (
          <Text className="text-sm text-green-600 font-medium mt-3">
            ✓ {data.paymentMethods.length} payment method(s) selected
          </Text>
        )}
      </ThemedView>

      <ThemedView className="bg-yellow-50 rounded-lg p-4 mb-4">
        <Text className="text-sm text-yellow-800">
          💡 <Text className="font-medium">Pricing Tips:</Text>
        </Text>
        <Text className="text-sm text-yellow-700 mt-1">
          • Research similar properties in your area for competitive pricing{'\n'}
          • Consider including utilities in rent for easier management{'\n'}
          • Be clear about what's included in the rent price
        </Text>
      </ThemedView>

      <ThemedView className="bg-blue-50 rounded-lg p-4">
        <Text className="text-sm text-blue-800">
          💳 <Text className="font-medium">Payment Security:</Text> Always use secure payment methods and 
          consider using escrow services for large deposits.
        </Text>
      </ThemedView>
    </ScrollView>
  );
}
