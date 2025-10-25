import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
        conv.ownerId === user.id || conv.tenantId === user.id ||
        conv.owner_id === user.id || conv.tenant_id === user.id // Support legacy field names
      );

      let totalUnread = 0;
      for (const conv of userConversations) {
        const isOwner = user.id === conv.ownerId || user.id === conv.owner_id;
        const unreadCount = isOwner ? 
          (conv.unreadByOwner || conv.unread_by_owner || 0) : 
          (conv.unreadByTenant || conv.unread_by_tenant || 0);
        totalUnread += unreadCount;
      }

      console.log('📊 Total unread messages:', totalUnread);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('❌ Error refreshing unread count:', error);
    }
  }, [user?.id]);

  // Create a stable reference to avoid infinite loops
  const refreshUnreadCountRef = useRef(refreshUnreadCount);
  refreshUnreadCountRef.current = refreshUnreadCount;

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      console.log('✅ Marking conversation as read:', conversationId);
      
      const conversation = await db.get('conversations', conversationId);
      if (!conversation) return;

      const isOwner = user.id === conversation.ownerId || user.id === conversation.owner_id;
      const now = new Date().toISOString();

      await db.upsert('conversations', conversationId, {
        ...conversation,
        unreadByOwner: isOwner ? 0 : (conversation.unreadByOwner || conversation.unread_by_owner || 0),
        unreadByTenant: !isOwner ? 0 : (conversation.unreadByTenant || conversation.unread_by_tenant || 0),
        lastReadByOwner: isOwner ? now : (conversation.lastReadByOwner || conversation.last_read_by_owner),
        lastReadByTenant: !isOwner ? now : (conversation.lastReadByTenant || conversation.last_read_by_tenant),
        updatedAt: now
      });

      // Refresh unread count by calling the function directly
      await refreshUnreadCountRef.current();
    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
    }
  }, [user?.id]);

  // Refresh unread count when user changes
  useEffect(() => {
    if (user?.id) {
      refreshUnreadCountRef.current();
    }
  }, [user?.id]);

  // Periodic refresh of unread count
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      refreshUnreadCountRef.current();
    }, 15000); // Check every 15 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [user?.id]);

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
