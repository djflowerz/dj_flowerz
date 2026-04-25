/// <reference types="vite/client" />
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../utils/supabase';
import posthog from 'posthog-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  realLogin: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  session: any | null;
  refreshUserProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch/set user from Supabase + D1 Profile
  const fetchProfileAndSetUser = useCallback(async (session: any) => {
    setSession(session);
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    const sbUser = session.user;
    const normalizeEmail = (e: string) => e?.toLowerCase().trim() || '';
    
    // Multi-email admin support
    const ADMIN_EMAILS = [
      (import.meta.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com').toLowerCase().trim(),
      'djflowerz254@gmail.com'
    ];
    
    const isAdminEmail = ADMIN_EMAILS.includes(normalizeEmail(sbUser.email));

    // 1. Sync with D1 Backend Profile
    let d1Profile: any = null;
    let needsSetup = false;
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Actor-Id': sbUser.id
        }
      });
      const data = await resp.json();
      if (data.needsSetup) {
        needsSetup = true;
        // Keep partial data (subscription info) even if profile needs setup
        d1Profile = data; 
      } else {
        d1Profile = data;
      }
    } catch (e) {
      console.error('[AuthContext] Sync Error:', e);
    }

    // 2. Merge Identity
    const isSubActive = (() => {
      if (isAdminEmail) return true;
      if (!d1Profile?.is_subscriber) return false;
      if (!d1Profile?.subscription_expiry) return false;
      try {
        return new Date(d1Profile.subscription_expiry) > new Date();
      } catch {
        return false;
      }
    })();

    const userData: User = {
      id: sbUser.id,
      name: d1Profile?.full_name || sbUser.user_metadata?.full_name || 'User',
      email: sbUser.email || '',
      handle: d1Profile?.handle ? `@${d1Profile.handle}` : undefined,
      role: isAdminEmail ? 'admin' : 'user',
      isAdmin: isAdminEmail,
      isSubscriber: isSubActive,
      subscriptionExpiry: d1Profile?.subscription_expiry || undefined,
      subscriptionPlan: d1Profile?.subscription_plan || undefined,
      avatarUrl: d1Profile?.avatar_url || sbUser.user_metadata?.avatar_url || '',
      bannerUrl: d1Profile?.banner_url || '',
      auraTier: d1Profile?.aura_tier || 'standard',
      auraPoints: d1Profile?.aura_points || 0,
      isVerified: !!d1Profile?.is_verified,
      primaryRole: d1Profile?.primary_role || 'Collector',
      needsSetup: needsSetup,
      createdAt: d1Profile?.created_at || sbUser.created_at,
      updatedAt: d1Profile?.updated_at || sbUser.updated_at
    };

    setUser(userData);
    
    // identify user on session load
    posthog.identify(userData.id, {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      handle: userData.handle,
      auraTier: userData.auraTier,
      isVerified: userData.isVerified
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfileAndSetUser(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfileAndSetUser(session);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndSetUser]);

  const login = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  const realLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    posthog.reset();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      realLogin,
      register,
      signInWithGoogle,
      logout,
      isAuthenticated: !!user,
      isProfileComplete: !!user && !user.needsSetup,
      session,
      refreshUserProfile: () => fetchProfileAndSetUser(session),
      updateUserProfile: (updates: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...updates } : null);
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
