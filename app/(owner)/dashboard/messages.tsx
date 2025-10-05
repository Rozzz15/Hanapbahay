import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  MessageSquare, 
  Search,
  Check
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/db';
import { ConversationRecord } from '@/types';
import {
    Avatar,
    AvatarBadge,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar";
import { Input, InputField } from '@/components/ui/input';

interface ChatItem {
  id: string;
  name: string;
  message: string;
  time: string;
  unreadCount?: number;
  avatar?: string;
  read?: boolean;
  conversationId?: string;
  otherUserId?: string;
}

export default function OwnerMessages() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ChatItem[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMessages = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Load actual conversations from database
      const convos = await db.list<ConversationRecord>('conversations');
      
      // Filter conversations where user is the owner
      const ownerConversations = convos.filter(c => c.ownerId === user.id);
      
      // Map to ChatItem format
      const mappedConversations: ChatItem[] = ownerConversations.map(c => {
        const otherUserId = c.participantIds.find(pid => pid !== user.id);
        return {
          id: c.id,
          conversationId: c.id,
          otherUserId: otherUserId,
          name: `Tenant ${otherUserId?.slice(-4) || 'Unknown'}`,
          message: c.lastMessageText || 'Start chatting',
          time: c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString() : '',
          avatar: '',
          read: true, // You can implement read status logic here
          unreadCount: 0 // You can implement unread count logic here
        };
      });
      
      setConversations(mappedConversations);
      setFilteredConversations(mappedConversations);
      
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.name.toLowerCase().includes(query.toLowerCase()) ||
        conv.message.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  };

  const handleChatPress = (chat: ChatItem) => {
    router.push({
      pathname: "/chat-room",
      params: {
        name: chat.name,
        avatar: chat.avatar,
        conversationId: chat.conversationId,
        otherUserId: chat.otherUserId,
      },
    });
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadMessages();
    }
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg font-semibold text-gray-600 mb-2">Authentication Required</Text>
          <TouchableOpacity 
            onPress={() => router.push('/login')}
            className="bg-indigo-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Messages</Text>
          <Text className="text-gray-600">Chat with tenants</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="p-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <Search size={20} color="#6B7280" />
          <Input className="flex-1 ml-2 bg-transparent">
            <InputField
              id="search-messages"
              name="search-messages"
              placeholder="Search messages..."
              value={searchQuery}
              onChangeText={handleSearch}
              className="text-gray-800"
            />
          </Input>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-2">
          {loading ? (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-gray-600">Loading conversations...</Text>
            </View>
          ) : filteredConversations.length === 0 ? (
            <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 items-center">
              <MessageSquare size={48} color="#9CA3AF" />
              <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">No conversations yet</Text>
              <Text className="text-gray-600 text-center mb-6">
                You'll receive messages from potential tenants here
              </Text>
            </View>
          ) : (
            <View>
              {filteredConversations.map((chat) => (
                <TouchableOpacity 
                  key={chat.id} 
                  onPress={() => handleChatPress(chat)}
                  className="bg-white rounded-lg border border-gray-200 p-3"
                >
                  <View className="flex-row items-center">
                    <Avatar className="bg-gray-300 mr-3">
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
                    
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="font-semibold text-gray-900 text-lg">{chat.name}</Text>
                        <Text className="text-gray-500 text-sm">{chat.time}</Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className={`text-gray-600 ${chat.read ? "text-gray-500" : "font-bold"}`}>
                          {chat.message}
                        </Text>
                        {chat.read ? (
                          <Check size={16} color="#3B82F6" />
                        ) : (
                          <Check size={16} color="#9CA3AF" />
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}