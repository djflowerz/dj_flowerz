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

  // Sync with Supabase Auth state
  useEffect(() => {
    let mounted = true;

    // Helper to fetch profile and set user
    const fetchProfileAndSetUser = async (session: any) => {
      if (!session?.user) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const sbUser = session.user;
      const isAdminEmail = sbUser.email === (import.meta.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com');

      try {
        // Fetch or Create Profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching profile:", error);
        }

        let userData: User;

        if (profile) {
          // Profile exists
          // Update last seen
          supabase.from('profiles').update({
            last_seen: new Date().toISOString(),
            presence_status: 'online'
          }).eq('id', sbUser.id).then(({ error: updateError }) => {
            if (updateError) console.error("Error updating last_seen:", updateError);
          });

          userData = {
            id: sbUser.id,
            name: profile.name || sbUser.user_metadata?.full_name || 'User',
            email: sbUser.email || '',
            role: profile.role || (isAdminEmail ? 'admin' : 'user'),
            isAdmin: (profile.role === 'admin') || isAdminEmail,
            isSubscriber: profile.is_subscriber || false,
            subscriptionPlan: profile.subscription_plan,
            subscriptionExpiry: profile.subscription_expiry,
            avatarUrl: profile.avatar_url || sbUser.user_metadata?.avatar_url || '',
            referralCode: profile.referral_code,
            balance: profile.balance || 0,
            createdAt: profile.created_at || new Date().toISOString(),
            updatedAt: profile.updated_at || new Date().toISOString()
          };
        } else {
          // Profile doesn't exist, create it
          const now = new Date().toISOString();
          const referralCode = generateReferralCode(sbUser.user_metadata?.full_name || 'USR');

          let referrerId = null;
          const refCode = localStorage.getItem('referralCode');
          if (refCode) {
            const { data: refProfile } = await supabase.from('profiles').select('id').eq('referral_code', refCode).single();
            if (refProfile) referrerId = refProfile.id;
          }

          // Check for existing active subscription (e.g. guest checkout or manual entry)
          let initialSubscriberStatus = false;
          let initialSubscriptionPlan = null;
          let initialSubscriptionExpiry = null;

          if (sbUser.email) {
            const { data: existingSub } = await supabase
              .from('subscriptions')
              .select('plan_id, expiry_date')
              .eq('user_email', sbUser.email)
              .eq('status', 'active')
              .maybeSingle();

            if (existingSub) {
              initialSubscriberStatus = true;
              initialSubscriptionPlan = existingSub.plan_id;
              initialSubscriptionExpiry = existingSub.expiry_date;
            }
          }

          const newProfile = {
            id: sbUser.id,
            name: sbUser.user_metadata?.full_name || 'User',
            email: sbUser.email || '',
            role: isAdminEmail ? 'admin' : 'user',
            is_subscriber: initialSubscriberStatus,
            subscription_plan: initialSubscriptionPlan,
            subscription_expiry: initialSubscriptionExpiry,
            avatar_url: sbUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sbUser.user_metadata?.full_name || 'User')}&background=random`,
            referral_code: referralCode,
            referred_by: referrerId,
            created_at: now,
            updated_at: now,
            last_seen: now,
            presence_status: 'online'
          };

          const { error: insertError } = await supabase.from('profiles').insert(newProfile);

          if (insertError) {
            console.error("Error creating profile:", insertError);
          }

          userData = {
            id: newProfile.id,
            name: newProfile.name,
            email: newProfile.email,
            role: newProfile.role as any,
            isAdmin: newProfile.role === 'admin',
            isSubscriber: newProfile.is_subscriber,
            subscriptionPlan: newProfile.subscription_plan,
            subscriptionExpiry: newProfile.subscription_expiry,
            avatarUrl: newProfile.avatar_url,
            referralCode: newProfile.referral_code,
            createdAt: newProfile.created_at,
            updatedAt: newProfile.updated_at
          };
        }

        if (mounted) {
          setUser(userData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth sync error:", err);
        if (mounted) setLoading(false);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfileAndSetUser(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfileAndSetUser(session);
    });

    // Capture referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode.toUpperCase());
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Realtime listener: update user state when their profile changes in Supabase
  // This ensures subscription status updates immediately after webhook fires
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as any;
          setUser(prev => prev ? {
            ...prev,
            isSubscriber: updated.is_subscriber || false,
            subscriptionPlan: updated.subscription_plan,
            subscriptionExpiry: updated.subscription_expiry,
            name: updated.name || prev.name,
            avatarUrl: updated.avatar_url || prev.avatarUrl,
            balance: updated.balance || 0,
          } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
      // Map other fields as necessary

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Error updating profile:", error);
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

    const { error } = await supabase.rpc('delete_user'); // Requires a custom RPC or Edge Function usually
    // Fallback: Delete profile
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);
    if (profileError) console.error("Could not delete profile", profileError);

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
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (error) throw error;

        setUser(prev => prev ? ({
          ...prev,
          isSubscriber: true,
          subscriptionPlan: 'monthly',
          subscriptionExpiry: updates.subscription_expiry
        }) : null);

      } catch (e) {
        console.error("Failed to update subscription:", e);
        alert("Failed to update subscription. Check console.");
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
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

          if (error) throw error;

          setUser(prev => prev ? ({
            ...prev,
            isSubscriber: false,
            subscriptionPlan: null,
            subscriptionExpiry: undefined
          }) : null);

          alert("Your subscription has expired. Please renew to continue accessing the Music Pool.");
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
        await supabase.from('profiles').update({
          last_seen: now,
          presence_status: 'online',
          updated_at: now
        }).eq('id', user.id);
      } catch (e) {
        console.warn("Presence update failed:", e);
      }
    };

    updatePresence();
    const presenceInterval = setInterval(updatePresence, 120000);
    return () => clearInterval(presenceInterval);
  }, [user?.id, loading]);

  // --- Real-time Profile Sync ---
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
            // Merge updates
            return {
              ...prev,
              isSubscriber: newProfile.is_subscriber,
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
      checkEmailVerification
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
