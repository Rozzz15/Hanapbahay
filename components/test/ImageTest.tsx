import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from '../ui/image';

const ImageTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Loading Test</Text>
      
      {/* Test with a valid image URI */}
      <View style={styles.testSection}>
        <Text style={styles.label}>Valid Image URI:</Text>
        <Image
          source={{ uri: 'https://picsum.photos/200/200' }}
          style={styles.image}
          showSkeleton={true}
          fallbackIcon="image"
        />
      </View>
      
      {/* Test with base64 data */}
      <View style={styles.testSection}>
        <Text style={styles.label}>Base64 Image:</Text>
        <Image
          source={{ 
            uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlRlc3QgSW1hZ2U8L3RleHQ+PC9zdmc+' 
          }}
          style={styles.image}
          showSkeleton={true}
          fallbackIcon="image"
        />
      </View>
      
      {/* Test with invalid URI */}
      <View style={styles.testSection}>
        <Text style={styles.label}>Invalid URI (should show fallback):</Text>
        <Image
          source={{ uri: 'invalid-uri' }}
          style={styles.image}
          showSkeleton={true}
          fallbackIcon="home"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  testSection: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
});

export default ImageTest;
