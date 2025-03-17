import { Image, StyleSheet, Platform } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

import { SafeAreaView } from "react-native";
import ListingCard from "@/components/ListingCard";
import CountSelect from '@/components/CountSelect';
import { GradientButton } from '@/components/GradientButton';
import { OutlineButton } from '@/components/OutlineButton';
import ChatList from '@/components/ChatList';
import { VStack } from '@/components/ui/vstack';

export default function DashboardScreen() {
  return (
    <SafeAreaView className="flex flex-col w-full p-4 bg-gray-100">
      <ListingCard
        image="https://picsum.photos/200/300.jpg"
        title="Bed spacer near PUP Lopez TEST 2342 234 234 23 "
        location="Yumul St."
        rating={4.8}
        reviews={73}
        rooms={4}
        size={50}
        price={1999}
      />
      <CountSelect
        label="Bedrooms" 
        onChange={(value) => console.log("Bedrooms:", value)} 
      />
      <GradientButton isLoading={false} text="Log in" onPress={() => console.log('Clicked')} />
      <GradientButton isLoading={true} text="Log in" onPress={() => console.log('Clicked')} />
      <OutlineButton isLoading={true} text="Submit" onPress={() => console.log('Clicked')} />
      <OutlineButton isLoading={false} text="Submit" onPress={() => console.log('Clicked')} />
      
      <VStack className='mt-5'>
        <ChatList chats={
          [
            { id: '1', name: 'John Doe', message: 'what r u doing?', time: '20 mins', unreadCount: 1, read: true },
            {id: '2', name: 'Jane Doe', message: 'testing this nav bar text', time: '5h', read: false}
          ]
        }></ChatList>
      </VStack>
    </SafeAreaView>
  );
}

