import React from 'react';
import { View, ScrollView } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Avatar,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar";

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'other';
    timestamp: string;
};

// Static messages for demo
const staticMessages: Message[] = [
    { id: '1', text: 'Kasama na po ba ang gamit', sender: 'other', timestamp: '15:23' },
    { id: '2', text: 'Hindi pa po kasama', sender: 'user', timestamp: '15:24' },
    { id: '3', text: 'Magkano po additional?', sender: 'other', timestamp: '15:24' },
    { id: '4', text: '500 po per month', sender: 'user', timestamp: '15:25' },
];

export default function ChatRoom() {
    const { name, avatar } = useLocalSearchParams();
    const router = useRouter();

    const MessageBubble = ({ message }: { message: Message }) => (
        <HStack 
            className={`mb-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
            {message.sender === 'other' && (
                <Avatar size="sm" className="mr-2">
                    {avatar ? (
                        <AvatarImage source={{ uri: avatar as string }} />
                    ) : (
                        <AvatarFallbackText>{(name as string)?.[0]}</AvatarFallbackText>
                    )}
                </Avatar>
            )}
            <View 
                className={`p-3 rounded-2xl max-w-[80%] ${
                    message.sender === 'user' 
                        ? 'bg-green-500 rounded-tr-none' 
                        : 'bg-gray-200 rounded-tl-none'
                }`}
            >
                <Text className={message.sender === 'user' ? 'text-white' : 'text-black'}>
                    {message.text}
                </Text>
                <Text 
                    size="xs" 
                    className={`text-right ${
                        message.sender === 'user' ? 'text-white' : 'text-gray-500'
                    }`}
                >
                    {message.timestamp}
                </Text>
            </View>
        </HStack>
    );

    return (
        <View className="flex-1 bg-white pt-14">
            {/* Header */}
            <HStack className="px-4 py-2 border-b border-gray-200 items-center">
                <Button
                    variant="link"
                    onPress={() => router.back()}
                    className="mr-2"
                >
                    <Text>Back</Text>
                </Button>
                <Avatar size="md" className="mr-2">
                    {avatar ? (
                        <AvatarImage source={{ uri: avatar as string }} />
                    ) : (
                        <AvatarFallbackText>{(name as string)?.[0]}</AvatarFallbackText>
                    )}
                </Avatar>
                <Text size="xl" className="font-bold">{name}</Text>
            </HStack>

            {/* Messages */}
            <ScrollView className="flex-1 px-4 pt-4">
                <VStack space="sm">
                    {staticMessages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                </VStack>
            </ScrollView>

            {/* Message Input */}
            <HStack className="p-4 border-t border-gray-200">
                <Input className="flex-1 mr-2" size="md">
                    <InputField placeholder="Type a message..." />
                </Input>
                <Button
                    size="md"
                    variant="solid"
                    className="bg-green-500"
                    onPress={() => {}}
                >
                    <Send size={20} color="white" />
                </Button>
            </HStack>
        </View>
    );
} 