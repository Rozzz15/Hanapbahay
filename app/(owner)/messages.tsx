import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  getOwnerMessages,
  type OwnerMessage
} from '../../utils/owner-dashboard';
import { showAlert } from '../../utils/alert';
import { 
  ArrowLeft,
  MessageSquare,
  User,
  Clock,
  Send
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';

export default function MessagesPage() {
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [messages, setMessages] = useState<OwnerMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('owner')) {
      showAlert('Access Denied', 'This page is for property owners only.');
      router.replace('/(tabs)');
      return;
    }

    loadMessages();
  }, [user]);

  const loadMessages = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const ownerMessages = await getOwnerMessages(user.id);
      setMessages(ownerMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      showAlert('Error', 'Failed to load messages');
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

  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <View style={sharedStyles.mainContent}>
          <ScrollView style={sharedStyles.scrollView}>
            <View style={sharedStyles.pageContainer}>
              {/* Header */}
              <View style={sharedStyles.pageHeader}>
                <View style={sharedStyles.headerLeft}>
                  <View style={styles.titleRow}>
                    <Text style={sharedStyles.pageTitle}>Messages</Text>
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={sharedStyles.pageSubtitle}>Communicate with tenants</Text>
                </View>
              </View>

          {/* Messages Section */}
          <View style={sharedStyles.section}>
            {messages.length === 0 ? (
              <View style={sharedStyles.emptyState}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.teal, { marginBottom: designTokens.spacing.lg }]}>
                  <MessageSquare size={32} color="#10B981" />
                </View>
                <Text style={sharedStyles.emptyStateTitle}>No messages yet</Text>
                <Text style={sharedStyles.emptyStateText}>
                  Messages from tenants will appear here
                </Text>
              </View>
            ) : (
              <View style={sharedStyles.list}>
                {messages.map((message) => (
                  <TouchableOpacity 
                    key={message.id}
                    style={[
                      sharedStyles.card,
                      !message.isRead && { backgroundColor: designTokens.colors.infoLight }
                    ]}
                    onPress={() => router.push(`/(owner)/chat-room/${message.conversationId}` as any)}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[sharedStyles.statIcon, iconBackgrounds.teal, { marginRight: designTokens.spacing.md }]}>
                          <User size={16} color="#10B981" />
                        </View>
                        <Text style={[sharedStyles.statLabel, { marginBottom: 0, fontSize: designTokens.typography.lg }]}>
                          {message.tenantName}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={12} color={designTokens.colors.textMuted} />
                        <Text style={[sharedStyles.statSubtitle, { marginLeft: 4 }]}>
                          {formatTime(message.createdAt)}
                        </Text>
                      </View>
                    </View>
                    
                    {message.propertyTitle && (
                      <View style={{ marginBottom: designTokens.spacing.sm }}>
                        <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.info, fontWeight: designTokens.typography.medium }]}>
                          {message.propertyTitle}
                        </Text>
                      </View>
                    )}
                    
                    <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.textPrimary }]} numberOfLines={2}>
                      {message.text}
                    </Text>
                    
                    {!message.isRead && (
                      <View style={{ 
                        backgroundColor: designTokens.colors.info, 
                        width: 8, 
                        height: 8, 
                        borderRadius: 4, 
                        marginTop: designTokens.spacing.sm 
                      }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = {
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
};
