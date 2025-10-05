import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuthUser, clearAuthUser, clearAuthSession } from '../utils/auth-user';
import { supabase } from '../utils/supabase-client';

interface AuthUser {
  id: string;
  roles: string[];
  permissions: string[];
  name?: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const authUser = await getAuthUser();
      if (authUser) {
        // Ensure user has required fields with fallbacks
        const userWithFallbacks = {
          id: authUser.id || `user-${Date.now()}`,
          roles: authUser.roles || ['tenant'],
          permissions: authUser.permissions || []
        };
        setUser(userWithFallbacks);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Starting comprehensive logout process...');
      
      // 1. Sign out from Supabase
      try {
        const { error: supabaseError } = await supabase.auth.signOut();
        if (supabaseError) {
          console.error('❌ Supabase signout error:', supabaseError);
          // Continue with local cleanup even if Supabase signout fails
        } else {
          console.log('✅ Successfully signed out from Supabase');
        }
      } catch (supabaseError) {
        console.error('❌ Supabase signout failed:', supabaseError);
        // Continue with local cleanup
      }
      
      // 2. Clear only session data, preserve user data
      try {
        await clearAuthSession();
        console.log('✅ Auth session cleared (user data preserved)');
      } catch (storageError) {
        console.error('❌ Error clearing session:', storageError);
        // Continue with state clearing
      }
      
      // 3. Clear user state - this is the most important step
      setUser(null);
      console.log('✅ User state cleared - user is now logged out');
      
      // 4. Force a small delay to ensure state update is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Comprehensive logout completed successfully');
      
      // 5. Force redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
        console.log('🔄 Redirecting to login page...');
      }
      
    } catch (error) {
      console.error('❌ Error signing out:', error);
      // Even if there's an error, try to clear local state
      try {
        await clearAuthSession();
        setUser(null);
        
        // Force redirect even on error
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        console.log('✅ Emergency logout completed - user is logged out');
      } catch (emergencyError) {
        console.error('❌ Emergency logout failed:', emergencyError);
        setUser(null);
        
        // Last resort - force redirect
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        console.log('✅ Force logout completed - user is logged out');
      }
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

