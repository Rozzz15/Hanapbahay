import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/utils/db';
import { useAuth } from './AuthContext';
import { getPaymentsPendingConfirmation } from '@/utils/owner-payment-confirmation';

interface NotificationContextType {
  unreadCount: number;
  pendingBookingsCount: number;
  pendingPaymentsCount: number;
  refreshUnreadCount: () => Promise<void>;
  refreshPendingBookings: () => Promise<void>;
  refreshPendingPayments: () => Promise<void>;
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
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
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
      const userConversations = conversations.filter(conv => {
        const c = conv as any;
        return c.ownerId === user.id || c.tenantId === user.id ||
               c.owner_id === user.id || c.tenant_id === user.id; // Support legacy field names
      });

      let totalUnread = 0;
      for (const conv of userConversations) {
        const c = conv as any;
        const isOwner = user.id === c.ownerId || user.id === c.owner_id;
        const unreadCount = isOwner ? 
          (c.unreadByOwner || c.unread_by_owner || 0) : 
          (c.unreadByTenant || c.unread_by_tenant || 0);
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

      const conv = conversation as any;
      const isOwner = user.id === conv.ownerId || user.id === conv.owner_id;
      const now = new Date().toISOString();

      await db.upsert('conversations', conversationId, {
        ...conversation,
        unreadByOwner: isOwner ? 0 : (conv.unreadByOwner || conv.unread_by_owner || 0),
        unreadByTenant: !isOwner ? 0 : (conv.unreadByTenant || conv.unread_by_tenant || 0),
        lastReadByOwner: isOwner ? now : (conv.lastReadByOwner || conv.last_read_by_owner),
        lastReadByTenant: !isOwner ? now : (conv.lastReadByTenant || conv.last_read_by_tenant),
        updatedAt: now
      });

      // Refresh unread count by calling the function directly
      await refreshUnreadCountRef.current();
    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
    }
  }, [user?.id]);

  const refreshPendingBookings = useCallback(async () => {
    if (!user?.id || !user?.roles?.includes('owner')) {
      setPendingBookingsCount(0);
      return;
    }

    try {
      console.log('📋 Refreshing pending bookings count for owner:', user.id);
      
      const allBookings = await db.list('bookings');
      const pendingCount = allBookings.filter(
        (booking: any) => booking.ownerId === user.id && booking.status === 'pending'
      ).length;

      console.log('📊 Pending bookings count:', pendingCount);
      setPendingBookingsCount(pendingCount);
    } catch (error) {
      console.error('❌ Error refreshing pending bookings count:', error);
    }
  }, [user?.id, user?.roles]);

  // Create a stable reference to avoid infinite loops
  const refreshPendingBookingsRef = useRef(refreshPendingBookings);
  refreshPendingBookingsRef.current = refreshPendingBookings;

  const refreshPendingPayments = useCallback(async () => {
    if (!user?.id || !user?.roles?.includes('owner')) {
      setPendingPaymentsCount(0);
      return;
    }

    try {
      console.log('💳 Refreshing pending payments count for owner:', user.id);
      
      const pendingPayments = await getPaymentsPendingConfirmation(user.id);
      console.log('📊 Pending payments count:', pendingPayments.length);
      setPendingPaymentsCount(pendingPayments.length);
    } catch (error) {
      console.error('❌ Error refreshing pending payments count:', error);
      setPendingPaymentsCount(0);
    }
  }, [user?.id, user?.roles]);

  // Create a stable reference to avoid infinite loops
  const refreshPendingPaymentsRef = useRef(refreshPendingPayments);
  refreshPendingPaymentsRef.current = refreshPendingPayments;

  // Refresh unread count when user changes
  useEffect(() => {
    if (user?.id) {
      refreshUnreadCountRef.current();
      refreshPendingBookingsRef.current();
      refreshPendingPaymentsRef.current();
    }
  }, [user?.id]);

  // Periodic refresh of unread count and pending bookings
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      refreshUnreadCountRef.current();
      refreshPendingBookingsRef.current();
      refreshPendingPaymentsRef.current();
    }, 15000); // Check every 15 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      pendingBookingsCount,
      pendingPaymentsCount,
      refreshUnreadCount,
      refreshPendingBookings,
      refreshPendingPayments,
      markAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
