import {
    Avatar,
    AvatarBadge,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar";
import { Check, CheckCheck } from "lucide-react-native";
import { VStack } from "../ui/vstack";
import { HStack } from "../ui/hstack";
import { Heading } from "../ui/heading";
import { Text } from "../ui/text";
import { Pressable, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export type ChatItem = {
    id: string;
    name: string;
    message: string;
    time: string;
    unreadCount?: number;
    avatar?: string;
    read?: boolean;
    conversationId?: string;
    otherUserId?: string;
};

type ChatListProps = {
    chats: ChatItem[];
};

const ChatList = ({ chats }: ChatListProps) => {
    const router = useRouter();

    const handleChatPress = (chat: ChatItem) => {
        router.push({
            pathname: "/chat-room",
            params: {
                conversationId: chat.conversationId,
                ownerName: chat.name, // This will be handled by chat-room regardless of who is owner/tenant
                ownerAvatar: chat.avatar || '',
            },
        });
    };

    return (
        <VStack space="2xl">
            {chats.map((chat) => (
                <Pressable key={chat.id} onPress={() => handleChatPress(chat)}>
                    <View style={styles.chatItem}>
                        <HStack space="md">
                            <Avatar style={styles.avatar}>
                                {chat.avatar ? (
                                    <AvatarImage source={{ uri: chat.avatar }} />
                                ) : (
                                    <AvatarFallbackText style={styles.avatarText}>
                                        {chat.name.charAt(0)}
                                    </AvatarFallbackText>
                                )}
                                {chat.unreadCount && chat.unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{chat.unreadCount}</Text>
                                    </View>
                                )}
                            </Avatar>
                            <VStack style={styles.chatContent}>
                                <HStack style={styles.headerRow}>
                                    <Heading size="lg">{chat.name}</Heading>
                                    <Text size="sm" style={styles.timeText}>{chat.time}</Text>
                                </HStack>
                                <HStack style={styles.messageRow}>
                                    <Text size="md" style={chat.read ? styles.readMessage : styles.unreadMessage}>
                                        {chat.message}
                                    </Text>
                                    {chat.read ? <CheckCheck color="#3B82F6" size={16} /> : <Check color="#6B7280" size={16} />}
                                </HStack>
                            </VStack>
                        </HStack>
                    </View>
                </Pressable>
            ))}
        </VStack>
    );
};

const styles = StyleSheet.create({
    chatItem: {
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    avatar: {
        backgroundColor: '#D1D5DB',
    },
    avatarText: {
        color: '#FFFFFF',
    },
    badge: {
        backgroundColor: '#DC2626',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
    },
    chatContent: {
        flex: 1,
    },
    headerRow: {
        justifyContent: 'space-between',
    },
    timeText: {
        color: '#6B7280',
    },
    messageRow: {
        justifyContent: 'space-between',
    },
    readMessage: {
        color: '#6B7280',
    },
    unreadMessage: {
        fontWeight: 'bold',
    },
});

export default ChatList;