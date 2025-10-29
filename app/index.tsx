import { useRouter } from 'expo-router';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Stay on main onboarding screen regardless of authentication state
  // Users can choose where to go from here (e.g., Login or Sign Up)

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Always show onboarding as the main entry point

  // Sample property images for the grid
  const propertyImages = [
    require("../assets/onboarding/h1.jpg"),
    require("../assets/onboarding/h2.jpg"),
    require("../assets/onboarding/h3.jpg"),
    require("../assets/onboarding/h4.jpg"),
    require("../assets/onboarding/h5.jpg"),
    require("../assets/onboarding/h6.jpg"),
    require("../assets/onboarding/h7.jpg"),
    require("../assets/onboarding/h8.jpg"),
    require("../assets/onboarding/h9.jpg"),
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
              Ready to start fresh in a new place? HanapBahay is here to guide you on your journey!
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.replace('/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => router.replace('/sign-up')}
              activeOpacity={0.8}
            >
              <Text style={styles.signupButtonText}>Sign Up</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
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
  loginButton: {
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
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signupButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
});
