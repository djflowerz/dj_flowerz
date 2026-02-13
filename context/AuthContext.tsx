
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../firebase';
import firebase from 'firebase/compat/app';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, role?: 'user' | 'admin') => Promise<void>;
  realLogin: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithTikTok: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  subscribe: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  isAuthenticated: boolean;
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

  // Sync with Firebase Auth state
  useEffect(() => {
    let profileUnsubscribe: () => void = () => { };

    const authUnsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      // Clean up previous profile listener if any
      profileUnsubscribe();

      if (fbUser) {
        setLoading(true);
        const userDocRef = db.collection('users').doc(fbUser.uid);

        // Start real-time listener for current user document
        profileUnsubscribe = userDocRef.onSnapshot(async (doc) => {
          if (doc.exists) {
            const userData = doc.data() as User;
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || import.meta.env.REACT_APP_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com';
            const isEmailAdmin = fbUser.email === adminEmail;

            // Optional: Auto-sync admin role if email matches but doc doesn't show it
            if (isEmailAdmin && (!userData.isAdmin || userData.role !== 'admin')) {
              await userDocRef.update({ isAdmin: true, role: 'admin' });
            }

            setUser({
              id: fbUser.uid,
              ...userData,
              isAdmin: isEmailAdmin || userData.isAdmin,
              role: isEmailAdmin ? 'admin' : userData.role
            } as User);
          } else {
            // Create user doc if it doesn't exist
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || import.meta.env.REACT_APP_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com';
            const isEmailAdmin = fbUser.email === adminEmail;

            const newUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || 'User',
              email: fbUser.email || '',
              role: isEmailAdmin ? 'admin' : 'user',
              isSubscriber: false,
              isAdmin: isEmailAdmin,
              avatarUrl: fbUser.photoURL || 'https://picsum.photos/seed/user/100/100',
              referralCode: generateReferralCode(fbUser.displayName || 'USR')
            };
            await userDocRef.set(newUser);
            setUser(newUser);
          }
          setLoading(false);
        }, (error) => {
          console.error("User profile sync error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      profileUnsubscribe();
    };
  }, []);

  const login = async (email: string, role: 'user' | 'admin' = 'user') => {
    throw new Error("Login requires password. Please use the login form.");
  };

  const realLogin = async (email: string, password: string) => {
    await auth.signInWithEmailAndPassword(email, password);
  };

  const handleAuthError = (error: any, provider: string) => {
    console.error(`${provider} Auth Error:`, error);
    alert(`${provider} Login Failed: ${error.message}`);
    throw error;
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (e) {
      handleAuthError(e, 'Google');
    }
  };

  const signInWithFacebook = async () => {
    try {
      const provider = new firebase.auth.FacebookAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (e) {
      handleAuthError(e, 'Facebook');
    }
  };

  const signInWithTikTok = async () => {
    try {
      const provider = new firebase.auth.OAuthProvider('oidc.tiktok');
      await auth.signInWithPopup(provider);
    } catch (e: any) {
      handleAuthError(e, 'TikTok');
    }
  };

  const register = async (name: string, email: string, password?: string) => {
    const pwd = password || "123456";
    const userCredential = await auth.createUserWithEmailAndPassword(email, pwd);
    const fbUser = userCredential.user;

    if (!fbUser) throw new Error("User creation failed");

    // Send verification email
    await fbUser.sendEmailVerification();

    // Check if user is admin based on email
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || import.meta.env.REACT_APP_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com';
    const isAdmin = email === adminEmail;

    const newUser: User = {
      id: fbUser.uid,
      name: name,
      email: email,
      role: isAdmin ? 'admin' : 'user',
      isSubscriber: false,
      isAdmin: isAdmin,
      avatarUrl: `https://ui-avatars.com/api/?name=${name}`,
      referralCode: generateReferralCode(name)
    };

    try {
      await db.collection('users').doc(fbUser.uid).set(newUser);
    } catch (e) {
      console.error("Failed to create user profile in Firestore:", e);
    }
    setUser(newUser);
  };

  const resetPassword = async (email: string) => {
    await auth.sendPasswordResetEmail(email);
  }

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  const subscribe = async () => {
    if (user) {
      const updates = {
        isSubscriber: true,
        subscriptionPlan: 'monthly',
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      setUser({ ...user, ...updates } as User);

      try {
        await db.collection('users').doc(user.id).update(updates);
      } catch (e) {
        console.error("Failed to update subscription in Firestore:", e);
        alert("Failed to update subscription on server. Check console.");
      }
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;
    try {
      await db.collection('users').doc(user.id).update(data);
      setUser(prev => prev ? { ...prev, ...data } : null);

      // Update Firebase Auth profile if name/photo changed
      const currentUser = auth.currentUser;
      if (currentUser) {
        if (data.name || data.avatarUrl) {
          await currentUser.updateProfile({
            displayName: data.name || currentUser.displayName,
            photoURL: data.avatarUrl || currentUser.photoURL
          });
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const updateUserPassword = async (password: string) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.updatePassword(password);
    }
  };

  // --- Auto-Remove Expired Subscriptions ---
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
          isSubscriber: false,
          subscriptionPlan: null,
          subscriptionExpiry: null
        };

        // Update local state immediately
        // @ts-ignore
        setUser(prev => prev ? ({ ...prev, ...updates }) : null);

        try {
          await db.collection('users').doc(user.id).update({
            isSubscriber: false,
            subscriptionPlan: firebase.firestore.FieldValue.delete(),
            subscriptionExpiry: firebase.firestore.FieldValue.delete()
          });
          alert("Your subscription has expired. Please renew to continue accessing the Music Pool.");
        } catch (e) {
          console.error("Failed to expire subscription:", e);
        }
      }
    };

    if (!loading && user) {
      checkExpiry(); // Check immediately on load
      interval = setInterval(checkExpiry, 60000); // Check every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login: (email, role) => Promise.resolve(),
      realLogin,
      register,
      signInWithGoogle,
      signInWithFacebook,
      signInWithTikTok,
      resetPassword,
      logout,
      subscribe,
      updateUserProfile,
      updateUserPassword,
      isAuthenticated: !!user
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
