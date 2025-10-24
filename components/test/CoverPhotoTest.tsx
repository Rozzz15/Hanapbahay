import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CoverPhoto } from '../ui/image';

/**
 * Test component to verify CoverPhoto functionality
 * This helps us debug why cover photos aren't showing
 */
const CoverPhotoTest: React.FC = () => {
  const testImageUrl = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&auto=format';
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CoverPhoto Component Test</Text>
      
      {/* Test 1: Valid image URL */}
      <View style={styles.testSection}>
        <Text style={styles.testTitle}>Test 1: Valid Image URL</Text>
        <CoverPhoto
          listingId="test-listing-1"
          coverPhoto={testImageUrl}
          style={styles.testImage}
          resizeMode="cover"
          showSkeleton={true}
          borderRadius={8}
          enableOptimization={true}
          optimizationOptions={{
            width: 200,
            height: 150,
            quality: 0.8
          }}
          enablePersistence={true}
          onError={(error) => {
            console.log('❌ Test 1 error:', error);
          }}
          onLoad={() => {
            console.log('✅ Test 1 loaded successfully');
          }}
        />
      </View>

      {/* Test 2: No cover photo, with fallback */}
      <View style={styles.testSection}>
        <Text style={styles.testTitle}>Test 2: No Cover Photo (Should show fallback)</Text>
        <CoverPhoto
          listingId="test-listing-2"
          coverPhoto={undefined}
          fallbackImage={testImageUrl}
          style={styles.testImage}
          resizeMode="cover"
          showSkeleton={true}
          borderRadius={8}
          enableOptimization={true}
          optimizationOptions={{
            width: 200,
            height: 150,
            quality: 0.8
          }}
          enablePersistence={true}
          onError={(error) => {
            console.log('❌ Test 2 error:', error);
          }}
          onLoad={() => {
            console.log('✅ Test 2 loaded successfully');
          }}
        />
      </View>

      {/* Test 3: No image at all (Should show fallback UI) */}
      <View style={styles.testSection}>
        <Text style={styles.testTitle}>Test 3: No Image (Should show fallback UI)</Text>
        <CoverPhoto
          listingId="test-listing-3"
          coverPhoto={undefined}
          fallbackImage={undefined}
          style={styles.testImage}
          resizeMode="cover"
          showSkeleton={true}
          borderRadius={8}
          enableOptimization={true}
          optimizationOptions={{
            width: 200,
            height: 150,
            quality: 0.8
          }}
          enablePersistence={true}
          onError={(error) => {
            console.log('❌ Test 3 error:', error);
          }}
          onLoad={() => {
            console.log('✅ Test 3 loaded successfully');
          }}
        />
      </View>

      {/* Test 4: Invalid image URL (Should show fallback UI) */}
      <View style={styles.testSection}>
        <Text style={styles.testTitle}>Test 4: Invalid Image URL (Should show fallback UI)</Text>
        <CoverPhoto
          listingId="test-listing-4"
          coverPhoto="invalid-url"
          fallbackImage={undefined}
          style={styles.testImage}
          resizeMode="cover"
          showSkeleton={true}
          borderRadius={8}
          enableOptimization={true}
          optimizationOptions={{
            width: 200,
            height: 150,
            quality: 0.8
          }}
          enablePersistence={true}
          onError={(error) => {
            console.log('❌ Test 4 error:', error);
          }}
          onLoad={() => {
            console.log('✅ Test 4 loaded successfully');
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  testSection: {
    marginBottom: 30,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  testImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
});

export default CoverPhotoTest;
