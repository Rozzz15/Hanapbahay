import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { ChevronRight, User2, Settings, CreditCard, HelpCircle, Home } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type MenuItem = {
    icon: React.ReactNode;
    label: string;
    route?: string;
};

const MenuButton = ({ item }: { item: MenuItem }) => {
    const router = useRouter();

    const handlePress = () => {
        if (item.route) {
            router.push(item.route as any); // Type assertion since we know these are valid routes
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            className="flex-row items-center py-4 px-4 bg-white border-b border-gray-100"
        >
            <View className="w-8 h-8 justify-center items-center rounded-full bg-gray-50 mr-3">
                {item.icon}
            </View>
            <Text className="flex-1 text-base">{item.label}</Text>
            <ChevronRight size={20} color="#9CA3AF" />
        </Pressable>
    );
};

export default function ProfileScreen() {
    const menuItems: MenuItem[] = [
        {
            icon: <User2 size={20} color="#4B5563" />,
            label: 'Personal details',
            route: '/(tabs)/profile/personal-details',
        },
        {
            icon: <Settings size={20} color="#4B5563" />,
            label: 'Settings',
            route: '/(tabs)/profile/settings',
        },
        {
            icon: <CreditCard size={20} color="#4B5563" />,
            label: 'Payment details',
            route: '/(tabs)/profile/payment-details',
        },
        {
            icon: <HelpCircle size={20} color="#4B5563" />,
            label: 'FAQ',
            route: '/(tabs)/profile/faq',
        },
        {
            icon: <Home size={20} color="#4B5563" />,
            label: 'Switch to hosting',
            route: '/(tabs)/profile/switch-to-hosting',
        },
    ];

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <VStack className="pt-14 pb-6 px-4 bg-white items-center border-b border-gray-100">
                <Avatar size="2xl" className="mb-3">
                    <AvatarFallbackText>LB</AvatarFallbackText>
                    <AvatarImage 
                        source={{ uri: 'https://example.com/avatar.jpg' }}
                        className="bg-gray-100"
                    />
                </Avatar>
                <Text className="text-xl font-semibold mb-1">Lucy Bond</Text>
                <Text className="text-gray-500">lucybond08@gmail.com</Text>
            </VStack>

            <VStack className="mt-4">
                {menuItems.map((item, index) => (
                    <MenuButton key={index} item={item} />
                ))}
            </VStack>
        </ScrollView>
    );
}
