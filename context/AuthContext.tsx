/// <reference types="vite/client" />
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../utils/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, role?: 'user' | 'admin') => Promise<void>;
  realLogin: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithTikTok: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  subscribe: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  isAuthenticated: boolean;
  mfaResolver: any;
  setMfaResolver: (resolver: any) => void;
  checkEmailVerification: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateReferralCode = (name: string) => {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${randomStr}`;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaResolver, setMfaResolver] = useState<any>(null);

  const isMounted = React.useRef(true);

  // Sync with Supabase Auth state
  useEffect(() => {
    isMounted.current = true;

    // Safety timeout — never let loading stay true forever
    const safetyTimer = setTimeout(() => {
      if (isMounted.current) {
        console.warn('Auth loading safety timeout triggered');
        setLoading(false);
      }
    }, 8000);

    const syncUserProfile = async (sbUser: any) => {
      if (!sbUser) {
        if (isMounted.current) {
          setUser(null);
          setLoading(false);
          clearTimeout(safetyTimer);
        }
        return;
      }

      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com';
      const isAdminEmail = sbUser.email === adminEmail;

      const initialUser: User = {
        id: sbUser.id,
        name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'User',
        email: sbUser.email || '',
        role: isAdminEmail ? 'admin' : 'user',
        isAdmin: isAdminEmail,
        isSubscriber: false,
        avatarUrl: sbUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sbUser.email || 'U')}&background=random`,
        referralCode: sbUser.email ? sbUser.email.split('@')[0].toUpperCase() : 'USER',
        createdAt: sbUser.created_at,
        updatedAt: sbUser.updated_at
      };

      if (isMounted.current) {
        setUser(initialUser);
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .single();

        if (profile) {
          // Update last seen (fire and forget)
          supabase.from('profiles').update({
            last_seen: new Date().toISOString(),
            presence_status: 'online'
          }).eq('id', sbUser.id).catch(() => { });

          const role = profile.role || (isAdminEmail ? 'admin' : 'user');
          const isAdmin = role === 'admin' || isAdminEmail;

          if (isMounted.current) {
            setUser({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: role as any,
              isAdmin: !!isAdmin,
              isSubscriber: !!profile.is_subscriber,
              subscriptionPlan: (profile as any).subscription_plan,
              subscriptionExpiry: (profile as any).subscription_expiry,
              avatarUrl: profile.avatar_url || initialUser.avatarUrl,
              referralCode: profile.referral_code || initialUser.referralCode,
              balance: profile.balance || 0,
              createdAt: profile.created_at,
              updatedAt: profile.updated_at
            });
          }
        } else if (profileError && profileError.code === 'PGRST116') {
          // Create missing profile
          const now = new Date().toISOString();
          const newProfile: any = {
            id: sbUser.id,
            name: initialUser.name,
            email: initialUser.email,
            role: isAdminEmail ? 'admin' : 'user',
            is_subscriber: false,
            avatar_url: initialUser.avatarUrl,
            referral_code: initialUser.referralCode + Math.floor(Math.random() * 1000),
            created_at: now,
            updated_at: now,
            last_seen: now,
            presence_status: 'online'
          };

          const { data: createdProfile } = await supabase.from('profiles').insert([newProfile]).select().single();

          if (isMounted.current) {
            const finalProfile = createdProfile || newProfile;
            setUser({
              ...initialUser,
              id: finalProfile.id,
              name: finalProfile.name,
              role: finalProfile.role as any,
              isAdmin: finalProfile.role === 'admin' || isAdminEmail,
              isSubscriber: !!finalProfile.is_subscriber,
              avatarUrl: finalProfile.avatar_url,
              referralCode: finalProfile.referral_code
            });
          }
        }
      } catch (err) {
        console.error("[Auth] syncUserProfile error:", err);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUserProfile(session?.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserProfile(session?.user);
    });

    // Capture referral code
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode.toUpperCase());
    }

    return () => {
      isMounted.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // --- Realtime listener for profile changes (immediate updates on webhook) ---
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`profile:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        if (payload.new) {
          const newProfile = payload.new as any;
          setUser(prev => {
            if (!prev) return null;
            return {
              ...prev,
              isSubscriber: !!newProfile.is_subscriber,
              subscriptionPlan: newProfile.subscription_plan,
              subscriptionExpiry: newProfile.subscription_expiry,
              role: newProfile.role,
              isAdmin: newProfile.role === 'admin' || prev.email === (import.meta.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com'),
              avatarUrl: newProfile.avatar_url,
              name: newProfile.name,
              balance: newProfile.balance,
              referralCode: newProfile.referral_code,
              updatedAt: newProfile.updated_at
            };
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // --- Methods ---

  const login = async () => { throw new Error("Use realLogin instead"); };

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
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        }
      }
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    });
    if (error) throw error;
  };

  const signInWithGoogleRedirect = async () => { await signInWithGoogle(); };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/` }
    });
    if (error) throw error;
  };

  const signInWithTikTok = async () => { alert("TikTok login is currently not supported via Supabase in this demo."); };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const checkEmailVerification = async () => {
    const { data } = await supabase.auth.getUser();
    return !!data.user?.email_confirmed_at;
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.name) updates.name = data.name;
    if (data.avatarUrl) updates.avatar_url = data.avatarUrl;
    if (data.role) updates.role = data.role;
    if (data.isSubscriber !== undefined) updates.is_subscriber = data.isSubscriber;

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) throw error;
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const updateUserEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  };

  const updateUserPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const deleteAccount = async () => {
    if (!user) return;
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase.auth.signOut();
    setUser(null);
  };

  const reauthenticate = async (password: string) => {
    if (user?.email) {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (error) throw error;
    }
  };

  const subscribe = async () => {
    if (user) {
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const updates = { is_subscriber: true, subscription_plan: 'monthly', subscription_expiry: expiry, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      setUser(prev => prev ? ({ ...prev, isSubscriber: true, subscriptionPlan: 'monthly', subscriptionExpiry: expiry }) : null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, realLogin, register,
      signInWithGoogle, signInWithGoogleRedirect, signInWithFacebook, signInWithTikTok,
      resetPassword, logout, subscribe,
      updateUserProfile, updateUserPassword, updateUserEmail,
      reauthenticate, deleteAccount, isAuthenticated: !!user,
      mfaResolver, setMfaResolver, checkEmailVerification
    } as any}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
