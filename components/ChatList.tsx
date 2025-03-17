import {
    Avatar,
    AvatarBadge,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar";
import { Check, CheckCheck } from "lucide-react-native";
import { VStack } from "./ui/vstack";
import { HStack } from "./ui/hstack";
import { Heading } from "./ui/heading";
import { Text } from "./ui/text";

export type ChatItem = {
    id: string;
    name: string;
    message: string;
    time: string;
    unreadCount?: number;
    avatar?: string;
    read?: boolean;
};

type ChatListProps = {
    chats: ChatItem[];
};

const ChatList = ({ chats }: ChatListProps) => {
    return (
        <VStack space="2xl">
            {chats.map((chat) => (
                <HStack key={chat.id} space="md" className="p-2 border-b border-gray-200">
                    <Avatar className="bg-gray-300">
                        {chat.avatar ? (
                            <AvatarImage src={chat.avatar} alt={chat.name} />
                        ) : (
                            <AvatarFallbackText className="text-white">
                                {chat.name.charAt(0)}
                            </AvatarFallbackText>
                        )}
                        {chat.unreadCount && chat.unreadCount > 0 && (
                            <AvatarBadge className="bg-red-600 px-2 py-1 rounded-full">
                                <Text className="text-white text-sm">{chat.unreadCount}</Text>
                            </AvatarBadge>
                        )}
                    </Avatar>
                    <VStack className="flex-1">
                        <HStack className="justify-between">
                            <Heading size="lg">{chat.name}</Heading>
                            <Text size="sm" className="text-gray-500">{chat.time}</Text>
                        </HStack>
                        <HStack className="justify-between">
                            <Text size="md" className={chat.read ? "text-gray-500" : "font-bold"}>
                                {chat.message}
                            </Text>
                            {chat.read ? <CheckCheck className="text-blue-500" size={16} /> : <Check size={16} />}
                        </HStack>
                    </VStack>
                </HStack>
            ))}
        </VStack>
    );
};

export default ChatList;