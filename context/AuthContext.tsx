
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
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync with Firebase Auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          // Fetch extra user details from Firestore
          const userDocRef = db.collection('users').doc(fbUser.uid);
          const userSnap = await userDocRef.get();

          if (userSnap.exists) {
            setUser({ id: fbUser.uid, ...userSnap.data() } as User);
          } else {
            // Fallback/Create if doc doesn't exist (e.g. first social login)
            const newUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || 'User',
              email: fbUser.email || '',
              role: 'user',
              isSubscriber: false,
              isAdmin: false,
              avatarUrl: fbUser.photoURL || 'https://picsum.photos/seed/user/100/100'
            };
            // Save to Firestore so we have a persistent record
            await userDocRef.set(newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser({
             id: fbUser.uid,
             name: fbUser.displayName || 'User',
             email: fbUser.email || '',
             role: 'user',
             isSubscriber: false,
             isAdmin: false,
             avatarUrl: fbUser.photoURL || 'https://picsum.photos/seed/user/100/100'
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, role: 'user' | 'admin' = 'user') => {
    throw new Error("Login requires password. Please use the login form.");
  };

  const realLogin = async (email: string, password: string) => {
    await auth.signInWithEmailAndPassword(email, password);
  };

  const handleAuthError = (error: any, provider: string) => {
    console.error(`${provider} Auth Error:`, error);
    // Alert the user about the error instead of mocking a login
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

    const newUser: User = {
      id: fbUser.uid,
      name: name,
      email: email,
      role: 'user', 
      isSubscriber: false,
      isAdmin: false,
      avatarUrl: `https://ui-avatars.com/api/?name=${name}`
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

  // --- Auto-Remove Expired Subscriptions ---
  useEffect(() => {
    const checkExpiry = async () => {
      if (user && user.isSubscriber && user.subscriptionExpiry && !user.isAdmin) {
        const now = new Date();
        const expiry = new Date(user.subscriptionExpiry);
        
        if (now > expiry) {
          console.log(`Subscription expired for ${user.name}. Removing access.`);
          
          const updates = { 
            isSubscriber: false, 
            subscriptionPlan: undefined,
            subscriptionExpiry: undefined
          };

          // Update local state
          setUser(prev => prev ? ({ ...prev, ...updates }) as User : null);

          try {
             // In v8, using FieldValue.delete() requires import
             await db.collection('users').doc(user.id).update({
                isSubscriber: false,
                subscriptionPlan: firebase.firestore.FieldValue.delete(),
                subscriptionExpiry: firebase.firestore.FieldValue.delete()
             });
            alert("Your subscription has expired. Please renew to continue accessing the Music Pool.");
          } catch(e) {
             console.error("Failed to expire subscription:", e);
          }
        }
      }
    };
    
    if(!loading) {
      checkExpiry();
      const interval = setInterval(checkExpiry, 60000); 
      return () => clearInterval(interval);
    }
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
