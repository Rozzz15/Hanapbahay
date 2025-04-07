import { Image, StyleSheet, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { HelloWave } from '../../components/HelloWave';
import ParallaxScrollView from '../../components/ParallaxScrollView';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { SafeAreaView } from "react-native";
import ListingList from '../../components/ListingList';
import ListingCarousel from '../../components/ListingCarousel';
import CountSelect from '../../components/CountSelect';
import { GradientButton } from '../../components/GradientButton';
import { OutlineButton } from '../../components/OutlineButton';
import ChatList from '../../components/ChatList';
import { VStack } from '../../components/ui/vstack';
import ListingCard from '../../components/ListingCard';
import LocationSearchBar from '../../components/LocationSearchBar';

export default function DashboardScreen() {
  const router = useRouter();

  const featuredListings = [
    {
      image: "https://picsum.photos/200/300.jpg",
      title: "Luxury Penthouse in BGC",
      location: "Taguig City",
      rating: 4.9,
      reviews: 156,
      rooms: 4,
      size: 120,
      price: 8500
    },
    {
      image: "https://picsum.photos/200/301.jpg",
      title: "Modern Studio Unit in Makati",
      location: "Makati City",
      rating: 4.8,
      reviews: 128,
      rooms: 2,
      size: 35,
      price: 2500
    },
    {
      image: "https://picsum.photos/200/302.jpg",
      title: "Cozy Apartment in BGC",
      location: "Taguig City",
      rating: 4.7,
      reviews: 94,
      rooms: 3,
      size: 65,
      price: 3500
    }
  ];

  const allListings = [
    {
      image: "https://picsum.photos/200/303.jpg",
      title: "Bed spacer near PUP Lopez",
      location: "Yumul St.",
      rating: 4.8,
      reviews: 73,
      rooms: 4,
      size: 50,
      price: 1999
    },
    {
      image: "https://picsum.photos/200/304.jpg",
      title: "Furnished Room in Quezon City",
      location: "Katipunan Ave.",
      rating: 4.6,
      reviews: 45,
      rooms: 1,
      size: 25,
      price: 1800
    },
    {
      image: "https://picsum.photos/200/305.jpg",
      title: "Family Home in Pasig",
      location: "Pasig City",
      rating: 4.9,
      reviews: 89,
      rooms: 5,
      size: 150,
      price: 12000
    },
    {
      image: "https://picsum.photos/200/306.jpg",
      title: "Student Dormitory in Manila",
      location: "Manila City",
      rating: 4.5,
      reviews: 67,
      rooms: 2,
      size: 30,
      price: 1500
    },
    {
      image: "https://picsum.photos/200/307.jpg",
      title: "Executive Condo in Ortigas",
      location: "Ortigas Center",
      rating: 4.8,
      reviews: 112,
      rooms: 3,
      size: 75,
      price: 4500
    },
    {
      image: "https://picsum.photos/200/308.jpg",
      title: "Loft Unit in Mandaluyong",
      location: "Mandaluyong City",
      rating: 4.7,
      reviews: 78,
      rooms: 2,
      size: 45,
      price: 2800
    }
  ];

  const handleSearch = (text: string) => {
    // TODO: Implement search functionality
    console.log('Searching for:', text);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-4">
        <VStack className="space-y-4">
          <VStack className="mt-4">
            <ThemedText className="text-lg text-gray-600">Find your place in</ThemedText>
            <VStack className="flex-row items-center space-x-2">
              <Ionicons name="location" size={24} color="#22c55e" />
              <ThemedText className="text-2xl font-semibold">Lopez, Quezon</ThemedText>
              <Ionicons name="chevron-down" size={24} color="#374151" />
            </VStack>
          </VStack>
          <LocationSearchBar onSearch={handleSearch} />
          <ListingCarousel listings={featuredListings} />
          <ListingList listings={allListings} />
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

