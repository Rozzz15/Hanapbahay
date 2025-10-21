import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, StyleSheet, SafeAreaView, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { db, generateId } from '../../../utils/db';
import { ConversationRecord, MessageRecord } from '../../../types';
import { ArrowLeft, Send, Image as ImageIcon } from 'lucide-react-native';
import { showAlert } from '../../../utils/alert';

// Utility function to normalize conversation data
const normalizeConversation = (conv: any): ConversationRecord => {
    return {
        id: conv.id,
        ownerId: conv.ownerId || conv.owner_id || '',
        tenantId: conv.tenantId || conv.tenant_id || '',
        participantIds: conv.participantIds || conv.participant_ids || [],
        lastMessageText: conv.lastMessageText || conv.last_message_text,
        lastMessageAt: conv.lastMessageAt || conv.last_message_at,
        createdAt: conv.createdAt || conv.created_at || new Date().toISOString(),
        updatedAt: conv.updatedAt || conv.updated_at || new Date().toISOString(),
        unreadByOwner: conv.unreadByOwner || conv.unread_by_owner || 0,
        unreadByTenant: conv.unreadByTenant || conv.unread_by_tenant || 0,
        lastReadByOwner: conv.lastReadByOwner || conv.last_read_by_owner,
        lastReadByTenant: conv.lastReadByTenant || conv.last_read_by_tenant,
    };
};

// Utility function to normalize message data
const normalizeMessage = (msg: any): MessageRecord => {
    return {
        id: msg.id,
        conversationId: msg.conversationId || msg.conversation_id || '',
        senderId: msg.senderId || msg.sender_id || '',
        text: msg.text,
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        readBy: msg.readBy || msg.read_by || [],
        type: msg.type || 'message',
        propertyId: msg.propertyId || msg.property_id,
        propertyTitle: msg.propertyTitle || msg.property_title,
        imageUri: msg.imageUri || msg.image_uri,
        imageWidth: msg.imageWidth || msg.image_width,
        imageHeight: msg.imageHeight || msg.image_height,
    };
};

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
  type: 'message' | 'inquiry' | 'booking_request' | 'image';
  propertyId?: string;
  propertyTitle?: string;
  imageUri?: string;
  imageWidth?: number;
  imageHeight?: number;
}

interface Conversation {
  id: string;
  ownerId: string;
  tenantId: string;
  tenantName: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadByOwner?: number;
}

export default function ChatRoom() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (id && user?.id) {
      loadConversationData();
    }
  }, [id, user]);

    // Add periodic message refresh to catch new messages
    useEffect(() => {
        if (!id || !user?.id) return;

        const interval = setInterval(async () => {
            try {
                console.log('🔄 Checking for new messages...');
                const allMessages = await db.list('messages');
                const normalizedMessages = allMessages.map(normalizeMessage);
                const messagesData = normalizedMessages
                    .filter(m => m.conversationId === id)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                
                // Remove duplicate messages based on ID using a Map for better performance
                const uniqueMessagesMap = new Map();
                messagesData.forEach(msg => {
                    if (!uniqueMessagesMap.has(msg.id)) {
                        uniqueMessagesMap.set(msg.id, msg);
                    }
                });
                const uniqueMessages = Array.from(uniqueMessagesMap.values());
                
                // Only update if there are actually new messages (compare by length and last message ID)
                const currentLastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;
                const newLastMsgId = uniqueMessages.length > 0 ? uniqueMessages[uniqueMessages.length - 1].id : null;
                
                if (uniqueMessages.length !== messages.length || currentLastMsgId !== newLastMsgId) {
                    console.log('📨 New messages found, updating...', {
                        old: messages.length,
                        new: uniqueMessages.length,
                        oldLastId: currentLastMsgId,
                        newLastId: newLastMsgId
                    });
                    setMessages(uniqueMessages);
                }
            } catch (error) {
                console.error('❌ Error checking for new messages:', error);
            }
        }, 3000); // Check every 3 seconds (reduced frequency to prevent duplicates)

        return () => clearInterval(interval);
    }, [id, user?.id, messages.length]);

  const loadConversationData = async () => {
    if (!id || !user?.id) return;

    try {
      setLoadingData(true);
      console.log('💬 Loading conversation data for owner:', { id, userId: user.id });
      
      // Load conversation details from local database
      const convData = await db.get('conversations', id);
      if (!convData) {
        throw new Error('Conversation not found');
      }
      const normalizedConv = normalizeConversation(convData);
      
      // Load tenant name from users table
      let tenantName = 'Tenant';
      try {
        const tenantUser = await db.get('users', normalizedConv.tenantId) as any;
        if (tenantUser) {
          tenantName = tenantUser.name || 'Tenant';
          console.log('👤 Loaded tenant name:', tenantName);
        }
      } catch (error) {
        console.log('⚠️ Could not load tenant name:', error);
      }
      
      setConversation({
        ...normalizedConv,
        tenantName: tenantName
      });

      // Load messages from local database
      const allMessages = await db.list('messages');
      const normalizedMessages = allMessages.map(normalizeMessage);
      const messagesData = normalizedMessages
        .filter(m => m.conversationId === id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Remove duplicate messages based on ID using a Map for better deduplication
      const uniqueMessagesMap = new Map();
      messagesData.forEach(msg => {
        if (!uniqueMessagesMap.has(msg.id)) {
          uniqueMessagesMap.set(msg.id, msg);
        }
      });
      const uniqueMessages = Array.from(uniqueMessagesMap.values());
      
      console.log('📥 Loaded messages for conversation:', messagesData.length);
      console.log('📥 Unique messages after deduplication:', uniqueMessages.length);
      setMessages(uniqueMessages);

      // Mark messages as read
      await markMessagesAsRead();
    } catch (error) {
      console.error('Error loading conversation:', error);
      showAlert('Error', 'Failed to load conversation');
      router.back();
    } finally {
      setLoadingData(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!id || !user?.id) return;

    try {
      console.log('📖 Marking messages as read for owner:', user.id);
      
      // Get unread messages
      const unreadMessages = messages.filter(msg => 
        msg.senderId !== user.id && !msg.readBy.includes(user.id)
      );

      if (unreadMessages.length > 0) {
        console.log(`📥 Found ${unreadMessages.length} unread messages`);
        
        // Update readBy array for each message
        for (const message of unreadMessages) {
          const updatedReadBy = [...message.readBy, user.id];
          await db.upsert('messages', message.id, {
            ...message,
            readBy: updatedReadBy
          });
        }

        // Update conversation unread count
        const conversation = await db.get('conversations', id);
        if (conversation) {
          const normalizedConv = normalizeConversation(conversation);
          await db.upsert('conversations', id, {
            ...normalizedConv,
            unreadByOwner: 0,
            lastReadByOwner: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id || !user?.id || !conversation) return;

    try {
      setLoading(true);
      console.log('📤 Owner sending message:', { conversationId: id, text: newMessage.trim() });

      // Check if message already exists to prevent duplicates
      const existingMessages = await db.list('messages') as any[];
      const now = new Date().toISOString();
      const isDuplicate = existingMessages.some((m: any) => 
        m.conversationId === id &&
        m.senderId === user.id &&
        m.text === newMessage.trim() &&
        Math.abs(new Date(m.createdAt).getTime() - new Date(now).getTime()) < 1000
      );
      
      if (isDuplicate) {
        console.log('⚠️ Duplicate message detected, skipping...');
        setNewMessage('');
        setLoading(false);
        return;
      }

      const messageId = generateId('msg');
      const messageData = {
        id: messageId,
        conversationId: id,
        senderId: user.id,
        text: newMessage.trim(),
        type: 'message' as const,
        readBy: [user.id],
        createdAt: now
      };

      // Save message to local database
      await db.upsert('messages', messageId, messageData);
      console.log('✅ Message saved to database');

      // Update conversation
      const normalizedConv = normalizeConversation(conversation);
      await db.upsert('conversations', id, {
        ...normalizedConv,
        lastMessageText: newMessage.trim(),
        lastMessageAt: now,
        unreadByTenant: (normalizedConv.unreadByTenant || 0) + 1,
        updatedAt: now
      });

      // Add message to local state (deduplication handled by ID)
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(m => m.id === messageId);
        if (exists) {
          console.log('⚠️ Message already in state, skipping...');
          return prev;
        }
        return [...prev, messageData];
      });
      setNewMessage('');

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      showAlert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwner = message.senderId === user?.id;
    const isLastMessage = index === messages.length - 1;
    const showTime = isLastMessage || 
      (index < messages.length - 1 && 
       new Date(message.createdAt).getTime() - new Date(messages[index + 1].createdAt).getTime() > 300000); // 5 minutes

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isOwner ? styles.messageContainerRight : styles.messageContainerLeft
      ]}>
        {!isOwner && (
          <View style={styles.messageAvatar}>
            <View style={styles.messageAvatarFallback}>
              <Text style={styles.messageAvatarText}>{conversation.tenantName?.[0]?.toUpperCase()}</Text>
            </View>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isOwner ? styles.messageBubbleRight : styles.messageBubbleLeft
        ]}>
          {message.propertyTitle && (
            <Text style={[
              styles.propertyTitle,
              isOwner ? styles.propertyTitleRight : styles.propertyTitleLeft
            ]}>
              📍 {message.propertyTitle}
            </Text>
          )}
          {message.type === 'image' && message.imageUri && (
            <Image
              source={{ uri: message.imageUri }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          <Text style={[
            styles.messageText,
            isOwner ? styles.messageTextRight : styles.messageTextLeft
          ]}>
            {message.text}
          </Text>
          {showTime && (
            <Text style={[
              styles.messageTime,
              isOwner ? styles.messageTimeRight : styles.messageTimeLeft
            ]}>
              {formatTime(message.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loadingData) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Loading conversation...</Text>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Conversation not found</Text>
        <TouchableOpacity 
          className="mt-4 bg-blue-600 px-6 py-3 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Modern Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{conversation.tenantName?.[0]?.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerName}>{conversation.tenantName}</Text>
              <Text style={styles.headerStatus}>Tenant</Text>
            </View>
          </View>
          
        </View>

        {/* Messages Area */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}
        </ScrollView>

        {/* Modern Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || loading) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={loading || !newMessage.trim()}
            >
              <Send size={20} color={(!newMessage.trim() || loading) ? "#9CA3AF" : "#FFFFFF"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  // Message bubble styles
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    marginRight: 8,
    marginTop: 4,
  },
  messageAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    flex: 1,
    maxWidth: 300,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  propertyTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  propertyTitleLeft: {
    color: '#3B82F6',
  },
  propertyTitleRight: {
    color: '#93C5FD',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextLeft: {
    color: '#111827',
  },
  messageTextRight: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
  },
  messageTimeLeft: {
    color: '#6B7280',
    textAlign: 'left',
  },
  messageTimeRight: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
});
