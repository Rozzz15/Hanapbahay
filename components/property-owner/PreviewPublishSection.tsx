import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ThemedView } from '@/components/common';
import { ThemedText } from '@/components/common';
import { GradientButton } from '@/components/buttons';
import { PropertyListing } from '@/types/property';
import { Eye, Save, Upload, CheckCircle, AlertCircle } from 'lucide-react-native';

interface PreviewPublishSectionProps {
  data: PropertyListing;
  onSaveDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
  isPublishing?: boolean;
}

export default function PreviewPublishSection({ 
  data, 
  onSaveDraft, 
  onPreview, 
  onPublish,
  isPublishing = false
}: PreviewPublishSectionProps) {
  
  const validateListing = () => {
    const errors = [];
    
    // Basic required field checks
    if (!data.propertyType) errors.push('Property type is required');
    if (!data.rentalType) errors.push('Rental type is required');
    if (!data.address || data.address.trim() === '') errors.push('Address is required');
    if (!data.monthlyRent || data.monthlyRent <= 0) errors.push('Monthly rent is required');
    if (!data.ownerName || data.ownerName.trim() === '') errors.push('Owner name is required');
    if (!data.contactNumber || data.contactNumber.trim() === '') errors.push('Contact number is required');
    if (!data.email || data.email.trim() === '') errors.push('Email is required');
    
    // Email format validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Valid email address format is required');
    }
    
    // Phone number format validation
    if (data.contactNumber && !data.contactNumber.startsWith('+63')) {
      errors.push('Contact number must start with +63');
    }
    
    // Photo validation
    if (!data.photos || data.photos.length === 0) {
      errors.push('At least one property photo is required');
    }
    
    // Cover photo validation
    if (!data.coverPhoto && (!data.photos || data.photos.length === 0)) {
      errors.push('Cover photo is required');
    }
    
    return errors;
  };

  const errors = validateListing();
  const isComplete = errors.length === 0;

  const handlePublish = () => {
    if (!isComplete) {
      Alert.alert(
        'Incomplete Listing',
        'Please complete all required fields before publishing:\n\n' + errors.join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Publish Listing',
      'Are you sure you want to publish this listing? It will be visible to potential tenants.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: onPublish }
      ]
    );
  };

  return (
    <ScrollView className="flex-1">
      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Listing Summary</ThemedText>
        
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Property Type:</Text>
            <Text className="font-medium">{data.propertyType || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Rental Type:</Text>
            <Text className="font-medium">{data.rentalType || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Address:</Text>
            <Text className="font-medium flex-1 text-right">{data.address || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Monthly Rent:</Text>
            <Text className="font-medium">₱{data.monthlyRent?.toLocaleString() || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Security Deposit:</Text>
            <Text className="font-medium">₱{data.securityDeposit?.toLocaleString() || 'None'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Availability:</Text>
            <Text className="font-medium">{data.availabilityStatus || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Lease Term:</Text>
            <Text className="font-medium">{data.leaseTerm || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Owner:</Text>
            <Text className="font-medium">{data.ownerName || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Contact:</Text>
            <Text className="font-medium">{data.contactNumber || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Email:</Text>
            <Text className="font-medium">{data.email || 'Not set'}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Photos:</Text>
            <Text className="font-medium">{data.photos.length} uploaded</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Amenities:</Text>
            <Text className="font-medium">{data.amenities.length} selected</Text>
          </View>
        </View>
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Validation Status</ThemedText>
        
        {isComplete ? (
          <View className="flex-row items-center bg-green-50 p-3 rounded-lg">
            <CheckCircle size={20} color="#10B981" />
            <Text className="ml-2 text-green-700 font-medium">
              All required fields completed! Ready to publish.
            </Text>
          </View>
        ) : (
          <View className="space-y-2">
            <View className="flex-row items-center bg-yellow-50 p-3 rounded-lg">
              <AlertCircle size={20} color="#F59E0B" />
              <Text className="ml-2 text-yellow-700 font-medium">
                {errors.length} field(s) need attention
              </Text>
            </View>
            
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-sm font-medium text-gray-700 mb-2">Missing fields:</Text>
              {errors.map((error, index) => (
                <Text key={index} className="text-sm text-gray-600">
                  • {error}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Actions</ThemedText>
        
        <View className="space-y-3">
          <TouchableOpacity
            onPress={onSaveDraft}
            className="flex-row items-center justify-center bg-gray-500 py-3 rounded-lg"
          >
            <Save size={20} color="white" />
            <Text className="ml-2 text-white font-medium">Save as Draft</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={onPreview}
            className="flex-row items-center justify-center bg-blue-500 py-3 rounded-lg"
          >
            <Eye size={20} color="white" />
            <Text className="ml-2 text-white font-medium">Preview Listing</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handlePublish}
            disabled={!isComplete || isPublishing}
            className={`flex-row items-center justify-center py-3 rounded-lg ${
              !isComplete || isPublishing
                ? 'bg-gray-300' 
                : 'bg-green-500'
            }`}
          >
            <Upload size={20} color="white" />
            <Text className="ml-2 text-white font-medium">
              {isPublishing 
                ? 'Publishing...' 
                : !isComplete 
                  ? 'Complete Required Fields' 
                  : 'Publish Listing'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView className="bg-blue-50 rounded-lg p-4">
        <Text className="text-sm text-blue-800 font-medium mb-2">
          📋 Publishing Checklist
        </Text>
        <Text className="text-sm text-blue-700">
          • All required fields completed ✓{'\n'}
          • High-quality photos uploaded ✓{'\n'}
          • Accurate pricing information ✓{'\n'}
          • Contact details verified ✓{'\n'}
          • House rules clearly stated ✓
        </Text>
      </ThemedView>
    </ScrollView>
  );
}
