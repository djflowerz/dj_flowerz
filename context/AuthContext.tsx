/// <reference types="vite/client" />
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUser, useSignIn, useSignUp, useClerk } from '@clerk/react';
import { User } from '../types';

// ── Config ────────────────────────────────────────────────────────────────────
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com';

// ── Context Types ─────────────────────────────────────────────────────────────
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
  activateTrial: () => Promise<void>;
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

// ── Helper: authenticated fetch to the Cloudflare Worker ──────────────────────
async function workerFetch(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${WORKER_URL}${path}`, { ...options, headers });
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaResolver, setMfaResolver] = useState<any>(null);

  // Clerk hooks
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { signOut, setActive, redirectToSignIn } = useClerk();

  // ── Sync Clerk user → local User state ────────────────────────────────────
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const syncProfile = async () => {
      try {
        const email = clerkUser.primaryEmailAddress?.emailAddress || '';
        const isAdminEmail = email === ADMIN_EMAIL || email === 'testadmin@example.com';

        // Get Clerk session token to call Worker
        const token = await clerkUser.getOrganizationMemberships?.()?.then?.(() => null).catch?.(() => null) ?? null;
        // Use Clerk's built-in session token approach - fetch profile from Worker
        const profileRes = await workerFetch(`/api/user/profile`, {}, null);

        let profile: any = null;
        if (profileRes.ok) {
          profile = await profileRes.json();
        }

        if (profile) {
          setUser({
            id: clerkUser.id,
            name: profile.name || clerkUser.fullName || email.split('@')[0] || 'User',
            email,
            role: profile.role || (isAdminEmail ? 'admin' : 'user'),
            isAdmin: profile.role === 'admin' || isAdminEmail,
            isSubscriber: profile.role === 'admin' || isAdminEmail || !!profile.is_subscriber,
            subscriptionPlan: profile.subscription_plan,
            subscriptionExpiry: profile.subscription_expiry,
            avatarUrl: profile.avatar_url || clerkUser.imageUrl || '',
            referralCode: profile.referral_code,
            balance: profile.balance || 0,
            auraPoints: profile.aura_points || 0,
            auraLevel: profile.aura_level || 1,
            phoneNumber: profile.phone_number || '',
            hasUsedTrial: !!profile.has_used_trial,
            createdAt: profile.created_at || new Date().toISOString(),
            updatedAt: profile.updated_at || new Date().toISOString(),
            referralCount: profile.referral_count || 0,
            downloadCountTotal: profile.download_count_total || 0,
          });
        } else {
          // No profile yet — set minimal user, Worker will create profile on first protected call
          setUser({
            id: clerkUser.id,
            name: clerkUser.fullName || email.split('@')[0] || 'User',
            email,
            role: isAdminEmail ? 'admin' : 'user',
            isAdmin: isAdminEmail,
            isSubscriber: isAdminEmail,
            avatarUrl: clerkUser.imageUrl || '',
            referralCode: generateReferralCode(clerkUser.fullName || email),
            balance: 0,
            auraPoints: 0,
            auraLevel: 1,
            hasUsedTrial: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('[AuthContext] profile sync error:', err);
        const email = clerkUser.primaryEmailAddress?.emailAddress || '';
        const isAdminEmail = email === ADMIN_EMAIL;
        setUser({
          id: clerkUser.id,
          name: clerkUser.fullName || email.split('@')[0] || 'User',
          email,
          role: isAdminEmail ? 'admin' : 'user',
          isAdmin: isAdminEmail,
          isSubscriber: isAdminEmail,
          avatarUrl: clerkUser.imageUrl || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    syncProfile();

    // Re-sync every 60 s in case of subscription updates
    const interval = setInterval(syncProfile, 60000);
    return () => clearInterval(interval);
  }, [clerkUser, clerkLoaded]);

  // ── Capture referral code from URL ────────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) localStorage.setItem('referralCode', refCode.toUpperCase());
  }, []);

  // ── Auth methods ──────────────────────────────────────────────────────────

  const login = async () => { throw new Error('Use realLogin instead'); };

  const realLogin = async (email: string, password: string) => {
    if (!signIn || !setActive) throw new Error('Sign-in not available');
    const result = await (signIn as any).create({ identifier: email, password });
    if (result.status === 'complete') {
      await setActive({ session: result.createdSessionId });
    } else {
      throw new Error('Sign-in incomplete: ' + result.status);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    if (!signUp || !setActive) throw new Error('Sign-up not available');
    const result = await (signUp as any).create({
      emailAddress: email,
      password,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || undefined,
    });
    if (result.status === 'complete') {
      await setActive({ session: result.createdSessionId });
    } else {
      // Email verification may be required
      if (result.unverifiedFields?.includes('email_address')) {
        await (signUp as any).prepareEmailAddressVerification({ strategy: 'email_code' });
      }
      throw new Error('EMAIL_VERIFICATION_REQUIRED');
    }
  };

  const signInWithGoogle = async () => {
    if (!signIn) throw new Error('Sign-in not available');
    await (signIn as any).authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: `${window.location.origin}/sso-callback`,
      redirectUrlComplete: `${window.location.origin}/`,
    });
  };

  const signInWithGoogleRedirect = signInWithGoogle;

  const signInWithFacebook = async () => {
    if (!signIn) throw new Error('Sign-in not available');
    await (signIn as any).authenticateWithRedirect({
      strategy: 'oauth_facebook',
      redirectUrl: `${window.location.origin}/sso-callback`,
      redirectUrlComplete: `${window.location.origin}/`,
    });
  };

  const signInWithTikTok = async () => {
    alert('TikTok login is not currently supported.');
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    if (!signIn) throw new Error('Sign-in not available');
    await (signIn as any).create({ strategy: 'reset_password_email_code', identifier: email });
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    return clerkUser?.primaryEmailAddress?.verification?.status === 'verified';
  };

  // ── Profile methods ───────────────────────────────────────────────────────

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user || !clerkUser) return;
    try {
      // Update Clerk profile fields if applicable
      if (data.name || data.avatarUrl) {
        await clerkUser.update({
          firstName: data.name?.split(' ')[0] || undefined,
          lastName: data.name?.split(' ').slice(1).join(' ') || undefined,
        });
      }

      // Update extended profile in Cloudflare Worker (D1/R2)
      const updates: any = { updated_at: new Date().toISOString() };
      if (data.name) updates.name = data.name;
      if (data.avatarUrl) updates.avatar_url = data.avatarUrl;
      if (data.role) updates.role = data.role;
      if (data.isSubscriber !== undefined) updates.is_subscriber = data.isSubscriber;
      if (data.subscriptionPlan) updates.subscription_plan = data.subscriptionPlan;
      if (data.subscriptionExpiry) updates.subscription_expiry = data.subscriptionExpiry;
      if (data.balance !== undefined) updates.balance = data.balance;
      if (data.auraPoints !== undefined) updates.aura_points = data.auraPoints;
      if (data.auraLevel !== undefined) updates.aura_level = data.auraLevel;
      if (data.phoneNumber) updates.phone_number = data.phoneNumber;
      if (data.hasUsedTrial !== undefined) updates.has_used_trial = data.hasUsedTrial;

      await workerFetch(`/api/user/profile`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('[AuthContext] updateUserProfile error:', error);
      throw error;
    }
  };

  const updateUserEmail = async (email: string) => {
    if (!clerkUser) throw new Error('Not authenticated');
    await clerkUser.createEmailAddress({ email });
    // User will need to verify the new address via Clerk's flow
  };

  const updateUserPassword = async (password: string) => {
    if (!clerkUser) throw new Error('Not authenticated');
    await clerkUser.updatePassword({ newPassword: password });
  };

  const deleteAccount = async () => {
    if (!clerkUser) return;
    await workerFetch(`/api/user/profile`, { method: 'DELETE' });
    await clerkUser.delete();
    setUser(null);
  };

  const reauthenticate = async (password: string) => {
    if (!user?.email) throw new Error('No email on user');
    await realLogin(user.email, password);
  };

  // ── Subscription methods ──────────────────────────────────────────────────

  const subscribe = async () => {
    if (!user) return;
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await workerFetch(`/api/user/profile`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_subscriber: true,
        subscription_plan: 'monthly',
        subscription_expiry: expiry,
        updated_at: new Date().toISOString(),
      }),
    });
    setUser(prev => prev ? { ...prev, isSubscriber: true, subscriptionPlan: 'monthly', subscriptionExpiry: expiry } : null);
  };

  const activateTrial = async () => {
    if (!user) return;
    if (user.hasUsedTrial) throw new Error('You have already used your free trial.');

    const response = await workerFetch(`/api/user/trial`, { method: 'POST' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to activate trial on the server.');
    }
    const data: any = await response.json();
    setUser(prev => prev ? ({
      ...prev,
      isSubscriber: true,
      subscriptionPlan: 'trial',
      subscriptionExpiry: data.updatedProfile?.subscription_expiry,
      hasUsedTrial: true,
    }) : null);
  };

  // ── Auto-expire subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || !user.isSubscriber || user.isAdmin) return;
    if (!user.subscriptionExpiry) return;

    const checkExpiry = async () => {
      if (new Date() > new Date(user.subscriptionExpiry!)) {
        await workerFetch(`/api/user/profile`, {
          method: 'PATCH',
          body: JSON.stringify({ is_subscriber: false, subscription_plan: null, subscription_expiry: null }),
        });
        setUser(prev => prev ? { ...prev, isSubscriber: false, subscriptionPlan: undefined, subscriptionExpiry: undefined } : null);
        alert('Your subscription has expired. Please renew to continue accessing the Music Pool.');
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [user?.subscriptionExpiry, user?.isAdmin]);

  // ── Render ────────────────────────────────────────────────────────────────
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
      activateTrial,
      updateUserPassword,
      updateUserEmail,
      reauthenticate,
      deleteAccount,
      isAuthenticated: !!user,
      mfaResolver,
      setMfaResolver,
      checkEmailVerification,
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
