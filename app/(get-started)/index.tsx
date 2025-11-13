import { useRouter } from 'expo-router';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';

const { width, height } = Dimensions.get('window');

export default function GetStartedScreen() {
  const router = useRouter();

  // Sample property images for the grid
  const propertyImages = [
    require("../../assets/onboarding/h1.jpg"),
    require("../../assets/onboarding/h2.jpg"),
    require("../../assets/onboarding/h3.jpg"),
    require("../../assets/onboarding/h4.jpg"),
    require("../../assets/onboarding/h5.jpg"),
    require("../../assets/onboarding/h6.jpg"),
    require("../../assets/onboarding/h7.jpg"),
    require("../../assets/onboarding/h8.jpg"),
    require("../../assets/onboarding/h9.jpg"),
  ];

  return (
    <React.Fragment>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Image Grid */}
          <View style={styles.imageGrid}>
            {propertyImages.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={image} style={styles.gridImage} />
              </View>
            ))}
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>New Place, New Home</Text>
            <Text style={styles.subtitle}>
              Hanapbahay welcomes you home! Discover places to live, rent, or connect — all within Lopez, Quezon
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.getStartedButton}
              onPress={() => router.push('/(get-started)/features')}
              activeOpacity={0.8}
            >
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginBottom: 40,
  },
  imageContainer: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.5%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  getStartedButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

