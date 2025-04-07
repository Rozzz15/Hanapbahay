import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

export default function FilterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: "Filters",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#f3f4f6' },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ml-2">
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          ),
        }} 
      />
      <View className="flex-1 px-4 py-4">
        <ThemedText>Filter options will go here</ThemedText>
      </View>
    </SafeAreaView>
  );
} 