import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PropertyVideoPlayer from '../PropertyVideoPlayer';

// Test component to verify video player functionality
export default function VideoPlayerTest() {
  const [visible, setVisible] = React.useState(false);
  
  // Sample video URLs for testing
  const testVideos = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Player Test</Text>
      <Text style={styles.subtitle}>
        Click the button below to test the video player with sample videos
      </Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => setVisible(true)}
      >
        <Text style={styles.buttonText}>Open Video Player</Text>
      </TouchableOpacity>
      
      <PropertyVideoPlayer
        videos={testVideos}
        visible={visible}
        onClose={() => setVisible(false)}
        initialIndex={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
