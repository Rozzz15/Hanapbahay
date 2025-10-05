import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, generateId } from '@/utils/db';
import { ConversationRecord, MessageRecord } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
    Avatar,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar";

type UiMessage = {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: string;
};

export default function ChatRoom() {
    const { name, avatar, conversationId, otherUserId } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [text, setText] = useState('');
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        const loadMessages = async () => {
            try {
                let convId = conversationId as string | undefined;
                if (!convId && user && otherUserId) {
                    // create or find conversation
                    const convos = await db.list<ConversationRecord>('conversations');
                    const existing = convos.find(c =>
                        c.participantIds.includes(user.id) && c.participantIds.includes(otherUserId as string)
                    );
                    if (existing) convId = existing.id;
                    else {
                        const newId = generateId('convo');
                        const now = new Date().toISOString();
                        const newConvo: ConversationRecord = {
                            id: newId,
                            ownerId: user.id,
                            tenantId: otherUserId as string,
                            participantIds: [user.id, otherUserId as string],
                            createdAt: now,
                            updatedAt: now,
                        };
                        await db.upsert('conversations', newId, newConvo);
                        convId = newId;
                    }
                }

                if (convId) {
                    const all = await db.list<MessageRecord>('messages');
                    const my = all.filter(m => m.conversationId === convId).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
                    setMessages(my.map(m => ({
                        id: m.id,
                        text: m.text,
                        sender: m.senderId === user?.id ? 'me' : 'them',
                        timestamp: new Date(m.createdAt).toLocaleTimeString(),
                    })));
                    // scroll to end
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
                }
            } catch (e) {
                // ignore
            }
        };
        loadMessages();
    }, [user, conversationId, otherUserId]);

    const MessageBubble = ({ message }: { message: UiMessage }) => (
        <HStack 
            className={`mb-2 ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
        >
            {message.sender === 'them' && (
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
                    message.sender === 'me' 
                        ? 'bg-green-500 rounded-tr-none' 
                        : 'bg-gray-200 rounded-tl-none'
                }`}
            >
                <Text className={message.sender === 'me' ? 'text-white' : 'text-black'}>
                    {message.text}
                </Text>
                <Text 
                    size="xs" 
                    className={`text-right ${
                        message.sender === 'me' ? 'text-white' : 'text-gray-500'
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
            <ScrollView ref={scrollRef} className="flex-1 px-4 pt-4">
                <VStack space="sm">
                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                </VStack>
            </ScrollView>

            {/* Message Input */}
            <HStack className="p-4 border-t border-gray-200">
                <Input className="flex-1 mr-2" size="md">
                    <InputField 
                        id="message"
                        name="message"
                        placeholder="Type a message..." 
                        value={text} 
                        onChangeText={setText} 
                    />
                </Input>
                <Button
                    size="md"
                    variant="solid"
                    className="bg-green-500"
                    onPress={async () => {
                        if (!text.trim() || !user) return;
                        const now = new Date().toISOString();
                        let convId = (conversationId as string) || '';
                        if (!convId && otherUserId) {
                            const convos = await db.list<ConversationRecord>('conversations');
                            const existing = convos.find(c => c.participantIds.includes(user.id) && c.participantIds.includes(otherUserId as string));
                            if (existing) convId = existing.id;
                        }
                        if (!convId) {
                            const newId = generateId('convo');
                            const convo: ConversationRecord = {
                                id: newId,
                                ownerId: user.id,
                                tenantId: (otherUserId as string) || user.id,
                                participantIds: [user.id, (otherUserId as string) || user.id],
                                createdAt: now,
                                updatedAt: now,
                            };
                            await db.upsert('conversations', newId, convo);
                            convId = newId;
                        }
                        const msgId = generateId('msg');
                        const msg: MessageRecord = {
                            id: msgId,
                            conversationId: convId,
                            senderId: user.id,
                            text: text.trim(),
                            createdAt: now,
                            readBy: [user.id],
                        };
                        await db.upsert('messages', msgId, msg);
                        await db.upsert('conversations', convId, {
                            id: convId,
                            ownerId: user.id,
                            tenantId: (otherUserId as string) || user.id,
                            participantIds: [user.id, (otherUserId as string) || user.id],
                            createdAt: now,
                            updatedAt: now,
                            lastMessageText: msg.text,
                            lastMessageAt: now,
                        } as ConversationRecord);
                        setMessages(prev => [...prev, { id: msgId, text: msg.text, sender: 'me', timestamp: new Date(now).toLocaleTimeString() }]);
                        setText('');
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
                    }}
                >
                    <Send size={20} color="white" />
                </Button>
            </HStack>
        </View>
    );
} 