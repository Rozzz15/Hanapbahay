import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '@/utils/db';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      console.log('🔔 Refreshing unread count for user:', user.id);
      
      // Get all conversations for this user
      const conversations = await db.list('conversations');
      const userConversations = conversations.filter(conv => 
        conv.owner_id === user.id || conv.tenant_id === user.id
      );

      let totalUnread = 0;
      for (const conv of userConversations) {
        const isOwner = user.id === conv.owner_id;
        const unreadCount = isOwner ? (conv.unread_by_owner || 0) : (conv.unread_by_tenant || 0);
        totalUnread += unreadCount;
      }

      console.log('📊 Total unread messages:', totalUnread);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('❌ Error refreshing unread count:', error);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      console.log('✅ Marking conversation as read:', conversationId);
      
      const conversation = await db.get('conversations', conversationId);
      if (!conversation) return;

      const isOwner = user.id === conversation.owner_id;
      const now = new Date().toISOString();

      await db.upsert('conversations', conversationId, {
        ...conversation,
        unread_by_owner: isOwner ? 0 : conversation.unread_by_owner,
        unread_by_tenant: !isOwner ? 0 : conversation.unread_by_tenant,
        last_read_by_owner: isOwner ? now : conversation.last_read_by_owner,
        last_read_by_tenant: !isOwner ? now : conversation.last_read_by_tenant,
        updated_at: now
      });

      // Refresh unread count
      await refreshUnreadCount();
    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
    }
  }, [user?.id, refreshUnreadCount]);

  // Refresh unread count when user changes
  useEffect(() => {
    if (user?.id) {
      refreshUnreadCount();
    }
  }, [user?.id, refreshUnreadCount]);

  // Periodic refresh of unread count
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [user?.id, refreshUnreadCount]);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      refreshUnreadCount,
      markAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
