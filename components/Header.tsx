import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';

export default function Header() {
    const router = useRouter();

    return (
        <View className="absolute top-0 right-0 z-50 p-4">
            <Pressable onPress={() => router.push('/(tabs)/profile')}>
                <Avatar size="md">
                    <AvatarFallbackText>LB</AvatarFallbackText>
                    <AvatarImage 
                        source={{ uri: 'https://example.com/avatar.jpg' }}
                        className="bg-gray-100"
                    />
                </Avatar>
            </Pressable>
        </View>
    );
} 