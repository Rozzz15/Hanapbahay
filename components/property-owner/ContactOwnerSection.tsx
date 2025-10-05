import React from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { ThemedView } from '@/components/common';
import { ThemedText } from '@/components/common';
import { ContactOwnerData } from '@/types/property';

interface ContactOwnerSectionProps {
  data: ContactOwnerData;
  onUpdate: (data: Partial<ContactOwnerData>) => void;
}

export default function ContactOwnerSection({ data, onUpdate }: ContactOwnerSectionProps) {
  const isPrePopulatedNames = data.ownerName && data.contactNumber && data.email; // Include email in check
  
  return (
    <ScrollView className="flex-1">
      {/* Success message for pre-populated data */}
      {isPrePopulatedNames && (
        <ThemedView className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
          <Text className="text-green-800 font-medium mb-2">✅ Contact information pre-populated from your account</Text>
          <Text className="text-green-700 text-sm">
            Your contact details have been automatically filled from your account registration. 
            You can edit any fields as needed.
          </Text>
        </ThemedView>
      )}

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Owner Information</ThemedText>
        
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Owner's Name *
            {data.ownerName && <Text className="text-green-600"> (✓ Pre-filled)</Text>}
          </Text>
          <TextInput
            value={data.ownerName}
            onChangeText={(text) => onUpdate({ ownerName: text })}
            placeholder="Enter your full name"
            className={`border rounded-lg px-3 py-3 text-gray-800 font-medium ${
              data.ownerName 
                ? 'border-green-400 bg-green-50 shadow-sm ring-2 ring-green-200' 
                : 'border-gray-300'
            }`}
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Business Name (Optional)</Text>
          <TextInput
            value={data.businessName}
            onChangeText={(text) => onUpdate({ businessName: text })}
            placeholder="Enter business name if applicable"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800"
          />
        </View>
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Contact Details</ThemedText>
        
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Contact Number *
            {data.contactNumber && <Text className="text-green-600"> (✓ Pre-filled)</Text>}
          </Text>
          <TextInput
            value={data.contactNumber}
            onChangeText={(text) => onUpdate({ contactNumber: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            className={`border rounded-lg px-3 py-3 text-gray-800 font-medium ${
              data.contactNumber 
                ? 'border-green-400 bg-green-50 shadow-sm ring-2 ring-green-200' 
                : 'border-gray-300'
            }`}
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Email Address *
            {data.email && <Text className="text-green-600"> (✓ Pre-filled)</Text>}
          </Text>
          <TextInput
            value={data.email}
            onChangeText={(text) => onUpdate({ email: text })}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 font-medium"
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Emergency Contact (Optional)</Text>
          <TextInput
            value={data.emergencyContact}
            onChangeText={(text) => onUpdate({ emergencyContact: text })}
            placeholder="Enter emergency contact number"
            keyboardType="phone-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800"
          />
          <Text className="text-xs text-gray-500 mt-1">
            A backup contact for urgent matters
          </Text>
        </View>
      </ThemedView>

      <ThemedView className="bg-blue-50 rounded-lg p-4 mb-4">
        <Text className="text-sm text-blue-800 font-medium mb-2">
          📝 Quick Fill Options
        </Text>
        <Text className="text-sm text-blue-700">
          • Use your personal contact info for better tenant reach{'\n'}
          • Consider adding an emergency contact for faster response{'\n'}
          • Business name helps establish credibility
        </Text>
      </ThemedView>

      <ThemedView className="bg-green-50 rounded-lg p-4 mb-4">
        <Text className="text-sm text-green-800 font-medium mb-2">
          📞 Contact Information Tips
        </Text>
        <Text className="text-sm text-green-700">
          • Use a professional email address{'\n'}
          • Ensure your phone number is always reachable{'\n'}
          • Consider using a business phone for better organization{'\n'}
          • Emergency contact should be someone who can help with urgent property matters
        </Text>
      </ThemedView>

      <ThemedView className="bg-blue-50 rounded-lg p-4">
        <Text className="text-sm text-blue-800">
          🔒 <Text className="font-medium">Privacy Note:</Text> Your contact information will be 
          visible to potential tenants. Make sure you're comfortable with the information you share.
        </Text>
      </ThemedView>
    </ScrollView>
  );
}