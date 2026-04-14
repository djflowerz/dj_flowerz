/// <reference types="vite/client" />
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../utils/supabase';
import { fetchFromR2, updateR2Item, addR2Item, addAdminNotification } from '../utils/r2';

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
  refreshProfile: () => Promise<void>;
  session: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateReferralCode = (name: string) => {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${randomStr}`;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaResolver, setMfaResolver] = useState<any>(null);

  // Helper to fetch profile and set user
  const fetchProfileAndSetUser = async (session: any) => {
    setSession(session);
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    const sbUser = session.user;
    const normalizeEmail = (e: string) => e?.toLowerCase().trim() || '';
    const adminEmailFromEnv = (import.meta.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com').toLowerCase().trim();
    const isAdminEmail = normalizeEmail(sbUser.email) === adminEmailFromEnv;
    let userData: User | null = null;

    try {
      // 1. Fetch Real-time Profile from D1 (Source of Truth)
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/user/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const { user: profile } = await response.json();
        
        userData = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          isAdmin: profile.role === 'admin',
          isSubscriber: profile.isSubscriber,
          subscriptionPlan: profile.subscriptionPlan,
          subscriptionExpiry: profile.subscriptionExpiry,
          avatarUrl: profile.avatarUrl,
          referralCode: profile.referralCode,
          balance: profile.balance,
          auraPoints: profile.loyaltyPoints,
          auraLevel: profile.auraLevel || 1,
          phoneNumber: profile.phoneNumber,
          username: profile.username,
          bio: profile.bio,
          location: profile.location,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          referralCount: profile.referralCount || 0,
          downloadCountTotal: profile.downloadCountTotal || 0,
          downloadsToday: profile.downloadsToday || 0,
          lastDownloadDate: profile.lastDownloadDate
        };
      } else {
        // Fallback or legacy check if /api/user/me fails (e.g., during migration)
        const profiles = await fetchFromR2<any[]>('profiles').catch(() => []);
        const profile = profiles.find(p => p.id === sbUser.id);
        
        if (profile) {
          userData = {
            id: sbUser.id,
            name: profile.name || sbUser.user_metadata?.full_name || 'User',
            email: sbUser.email || '',
            role: profile.role || (isAdminEmail ? 'admin' : 'user'),
            isAdmin: isAdminEmail,
            isSubscriber: isAdminEmail || profile.is_subscriber || profile.isSubscriber || false,
            subscriptionPlan: profile.subscription_plan || profile.subscriptionPlan,
            subscriptionExpiry: profile.subscription_expiry || profile.subscriptionExpiry,
            avatarUrl: profile.avatar_url || profile.avatarUrl || sbUser.user_metadata?.avatar_url || '',
            referralCode: profile.referral_code || profile.referralCode,
            balance: profile.balance || 0,
            auraPoints: profile.loyalty_points || profile.loyaltyPoints || profile.aura_points || profile.auraPoints || 0,
            auraLevel: profile.aura_level || profile.auraLevel || 1,
            phoneNumber: profile.phone_number || profile.phoneNumber || '',
            username: profile.username || '',
            bio: profile.bio || '',
            location: profile.location || '',
            createdAt: profile.created_at || profile.createdAt || new Date().toISOString(),
            updatedAt: profile.updated_at || profile.updatedAt || new Date().toISOString(),
          } as any;
        } else {
          // Profile doesn't exist, create it in R2
          const now = new Date().toISOString();
        const referralCode = generateReferralCode(sbUser.user_metadata?.full_name || 'USR');

        let referrerId = null;
        const refCode = localStorage.getItem('referralCode');
        if (refCode) {
          const refProfile = profiles.find(p => p.referral_code === refCode || p.referralCode === refCode);
          if (refProfile) referrerId = refProfile.id;
        }

        // Check for existing active subscription (from R2)
        let initialSubscriberStatus = false;
        let initialSubscriptionPlan = null;
        let initialSubscriptionExpiry = null;

        const subscriptions = await fetchFromR2<any[]>('subscriptions').catch(() => []);
        const existingSub = subscriptions.find(s => {
          const subEmail = (s.user_email || '').toLowerCase().trim();
          const targetEmail = (sbUser.email || '').toLowerCase().trim();
          return subEmail === targetEmail && s.status === 'active';
        });

        if (existingSub) {
          initialSubscriberStatus = true;
          initialSubscriptionPlan = existingSub.plan_id;
          initialSubscriptionExpiry = existingSub.expiry_date;
        }

        const defaultUsername = (sbUser.user_metadata?.full_name || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 20);

        const newProfile = {
          id: sbUser.id,
          name: sbUser.user_metadata?.full_name || 'User',
          email: sbUser.email || '',
          role: isAdminEmail ? 'admin' : 'user',
          is_subscriber: initialSubscriberStatus,
          subscription_plan: initialSubscriptionPlan,
          subscription_expiry: initialSubscriptionExpiry,
          avatar_url: sbUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sbUser.user_metadata?.full_name || 'User')}&background=random`,
          phone_number: sbUser.user_metadata?.phone_number || '',
          referral_code: referralCode,
          referred_by: referrerId,
          balance: 0,
          aura_points: 0,
          loyalty_points: 0,
          aura_level: 1,
          created_at: now,
          updated_at: now,
          last_seen: now,
          presence_status: 'online',
          referral_count: 0,
          download_count_total: 0,
          username: defaultUsername,
          bio: '',
          location: ''
        };

        // Save to local state
        userData = {
          id: newProfile.id,
          name: newProfile.name,
          email: newProfile.email,
          role: newProfile.role as any,
          isSubscriber: (newProfile.role === 'admin') || newProfile.is_subscriber,
          subscriptionPlan: newProfile.subscription_plan as any,
          subscriptionExpiry: newProfile.subscription_expiry as string,
          avatarUrl: newProfile.avatar_url,
          phoneNumber: newProfile.phone_number,
          referralCode: newProfile.referral_code,
          balance: newProfile.balance,
          auraPoints: (newProfile.aura_points || newProfile.loyalty_points || 0),
          loyaltyPoints: (newProfile.loyalty_points || newProfile.aura_points || 0),
          auraLevel: newProfile.aura_level,
          createdAt: newProfile.created_at,
          updatedAt: newProfile.updated_at,
          referralCount: newProfile.referral_count,
          downloadCountTotal: newProfile.download_count_total,
          username: newProfile.username,
          bio: newProfile.bio,
          location: newProfile.location
        };

        // Save to R2
        await addR2Item('profiles', newProfile).catch(err => {
          console.error("Error creating profile in R2:", err);
        });

        // Notify Admin
        addAdminNotification(
          "New User Signed Up!",
          `${newProfile.name} (${newProfile.email}) has just registered.`,
          'success'
        ).catch(err => console.error("Admin notification failed:", err));

        userData = {
          id: newProfile.id,
          name: newProfile.name,
          email: newProfile.email,
          role: newProfile.role as any,
          isAdmin: isAdminEmail,
          isSubscriber: isAdminEmail || newProfile.is_subscriber,
          subscriptionPlan: newProfile.subscription_plan as any,
          subscriptionExpiry: newProfile.subscription_expiry as string,
          avatarUrl: newProfile.avatar_url,
          username: newProfile.username,
          bio: newProfile.bio,
          location: newProfile.location,
          referralCode: newProfile.referral_code,
          balance: 0,
          auraPoints: 0,
          auraLevel: 1,
          createdAt: newProfile.created_at,
          updatedAt: newProfile.updated_at
        };
      }
    }

    setUser(userData);
      setLoading(false);
    } catch (err) {
      console.error("Auth sync error:", err);
      // Even if R2 profile fetch fails, keep user logged in with minimal data from session
      if (sbUser) {
        const isAdminEmail2 = normalizeEmail(sbUser.email) === adminEmailFromEnv;
        setUser({
          id: sbUser.id,
          name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
          email: sbUser.email || '',
          role: isAdminEmail2 ? 'admin' : 'user',
          isAdmin: isAdminEmail2,
          isSubscriber: false,
          avatarUrl: sbUser.user_metadata?.avatar_url || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchProfileAndSetUser(session);
    }
  };

  // Sync with Supabase Auth state
  useEffect(() => {
    let mounted = true;


    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) fetchProfileAndSetUser(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) fetchProfileAndSetUser(session);
    });

    // Capture referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode.toUpperCase());
    }

    // 60-second polling to keep profile in sync with R2 updates (referral rewards, subscriptions)
    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted && session) fetchProfileAndSetUser(session);
      });
    }, 60000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);


  // --- Auth Methods ---

  const login = async () => {
    throw new Error("Use realLogin instead");
  }

  const realLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
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
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    if (error) throw error;
  };

  const signInWithGoogleRedirect = async () => {
    await signInWithGoogle();
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });
    if (error) throw error;
  };

  const signInWithTikTok = async () => {
    alert("TikTok login is currently not supported via Supabase in this demo.");
  };

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
    // Supabase handles this via session; if we have a session but email isn't confirmed (and it's required),
    // usually signIn fails or session is minimal.
    // For this mocked function:
    const { data } = await supabase.auth.getUser();
    return !!data.user?.email_confirmed_at;
  };

  // --- Profile Methods ---

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;

    try {
      const updates: any = { updated_at: new Date().toISOString() };
      if (data.name) updates.name = data.name;
      if (data.avatarUrl) updates.avatar_url = data.avatarUrl;
      if (data.role) updates.role = data.role;
      if (data.isSubscriber !== undefined) updates.is_subscriber = data.isSubscriber;
      if (data.subscriptionPlan) updates.subscription_plan = data.subscriptionPlan;
      if (data.subscriptionExpiry) updates.subscription_expiry = data.subscriptionExpiry;
      if (data.balance !== undefined) updates.balance = data.balance;
      if (data.auraPoints !== undefined) {
        updates.aura_points = data.auraPoints;
        updates.loyalty_points = data.auraPoints;
      }
      if (data.auraLevel !== undefined) updates.aura_level = data.auraLevel;
      if (data.phoneNumber) updates.phone_number = data.phoneNumber;
      if (data.username !== undefined) updates.username = data.username;
      if (data.bio !== undefined) updates.bio = data.bio;
      if (data.location !== undefined) updates.location = data.location;


      await updateR2Item('profiles', user.id, updates);

      // Update local state
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Error updating profile in R2:", error);
      throw error;
    }
  };

  const updateUserEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
    // Note: User might need to confirm new email depending on settings
  };

  const updateUserPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  const deleteAccount = async () => {
    // Note: Only Supabase Service Role can strictly "delete" a user from auth.users via API,
    // or the user can delete themselves if configured.
    // Typically we just delete the profile or mark as inactive.
    // For now, we'll just try to delete the profile.
    if (!user) return;

    try {
      // Delete profile from R2
      const { removeR2Item } = await import('../utils/r2');
      await removeR2Item('profiles', user.id);
    } catch (profileError) {
      console.error("Could not delete profile from R2", profileError);
    }

    await supabase.auth.signOut();
    setUser(null);
  };

  const reauthenticate = async (password: string) => {
    // Supabase doesn't have a direct "reauthenticate" method like Firebase.
    // Usually you just ask for the password again and try to signIn,
    // or leave it be if the session is active.
    if (user?.email) {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password
      });
      if (error) throw error;
    }
  };


  const subscribe = async () => {
    if (user) {
      const updates = {
        is_subscriber: true,
        subscription_plan: 'monthly',
        subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const { saveToD1 } = await import('../context/DataContext').then(m => ({ saveToD1: (m as any).saveToD1 }));
        if (saveToD1) {
          await saveToD1('profiles', 'PUT', updates, user.id);
        } else {
          await updateR2Item('profiles', user.id, updates);
        }

        setUser(prev => prev ? ({
          ...prev,
          isSubscriber: true,
          subscriptionPlan: 'monthly',
          subscriptionExpiry: updates.subscription_expiry
        }) : null);

      } catch (e) {
        console.error("Failed to update subscription:", e);
        alert("Failed to update subscription.");
      }
    }
  };



  // --- Auto-Remove Expired Subscriptions ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkExpiry = async () => {
      if (!user || !user.isSubscriber || user.isAdmin) return;
      if (!user.subscriptionExpiry) return;

      const now = new Date();
      const expiry = new Date(user.subscriptionExpiry);

      if (now > expiry) {
        console.log(`Subscription expired for ${user.name}. Removing access.`);

        const updates = {
          is_subscriber: false,
          subscription_plan: null,
          subscription_expiry: null,
          updated_at: new Date().toISOString()
        };

        try {
          await updateR2Item('profiles', user.id, updates);

          setUser(prev => prev ? ({
            ...prev,
            isSubscriber: false,
            subscriptionPlan: null,
            subscriptionExpiry: undefined
          }) : null);

          alert("Your subscription has expired. Please renew to continue accessing premium features.");
        } catch (e) {
          console.error("Failed to expire subscription:", e);
        }
      }
    };

    if (!loading && user) {
      checkExpiry();
      interval = setInterval(checkExpiry, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, loading]);

  // --- Heartbeat for Presence ---
  useEffect(() => {
    if (!user || loading) return;

    const updatePresence = async () => {
      try {
        const now = new Date().toISOString();
        
        // 1. Update R2 (Legacy/Compatibility)
        updateR2Item('profiles', user.id, {
          last_seen: now,
          presence_status: 'online',
          updated_at: now
        }).catch(() => {});

        // 2. Update D1 (For Admin Dashboard)
        const apiBase = import.meta.env.VITE_API_URL || '';
        fetch(`${apiBase}/api/presence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          }
        }).catch(err => console.warn("Presence API update failed:", err));

      } catch (e) {
        console.warn("Presence loop error:", e);
      }
    };

    updatePresence();
    const presenceInterval = setInterval(updatePresence, 45000); // 45s heartbeat
    return () => clearInterval(presenceInterval);
  }, [user?.id, loading, session?.access_token]);

  // --- Removed Real-time Profile Sync (Supabase) ---

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      realLogin,
      register,
      signInWithGoogle,
      signInWithGoogleRedirect,
      signInWithFacebook,
      signInWithTikTok,
      resetPassword,
      logout,
      subscribe,
      updateUserProfile,
      updateUserPassword,
      updateUserEmail,
      reauthenticate,
      deleteAccount,
      isAuthenticated: !!user,
      mfaResolver,
      setMfaResolver,
      checkEmailVerification,
      refreshProfile,
      session
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
