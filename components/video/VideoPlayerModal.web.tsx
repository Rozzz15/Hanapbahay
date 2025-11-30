import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';

interface VideoPlayerModalProps {
  videoUri: string;
  onClose: () => void;
}

export default function VideoPlayerModal({ videoUri, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <video
        ref={videoRef}
        src={videoUri}
        autoPlay
        controls
        style={{
          width: '100%',
          maxWidth: Dimensions.get('window').width,
          maxHeight: Dimensions.get('window').height * 0.7,
          objectFit: 'contain',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

