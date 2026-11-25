import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  clampStr,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  updateUserProfileName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

async function syncUserDocument(firebaseUser: User, overrideName?: string): Promise<UserProfile> {
  const userPath = `users/${firebaseUser.uid}`;
  const ref = doc(db, 'users', firebaseUser.uid);
  const resolvedName = clampStr(
    overrideName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Researcher',
    120
  );
  const resolvedEmail = clampStr(firebaseUser.email || 'user@documind.local', 200);
  const resolvedPhoto = clampStr(firebaseUser.photoURL || '', 500);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const payload = {
        userId: firebaseUser.uid,
        name: resolvedName,
        email: resolvedEmail,
        ...(resolvedPhoto ? { photoURL: resolvedPhoto } : {}),
        role: 'researcher' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);
      return {
        userId: firebaseUser.uid,
        name: resolvedName,
        email: resolvedEmail,
        photoURL: resolvedPhoto,
        role: 'researcher',
      };
    }

    const existing = snap.data() as UserProfile;
    await updateDoc(ref, {
      name: existing.name || resolvedName,
      email: resolvedEmail,
      ...(resolvedPhoto ? { photoURL: resolvedPhoto } : {}),
      updatedAt: serverTimestamp(),
    });

    return {
      ...existing,
      name: existing.name || resolvedName,
      email: resolvedEmail,
      photoURL: resolvedPhoto || existing.photoURL,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in window was closed before completing authentication.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not enabled in the Firebase Console yet. Please use "Continue with Google" for instant access, or enable Email/Password under Firebase Authentication > Sign-in method.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please verify your credentials or continue with Google.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters long.';
  }
  return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setUser(fbUser);
      try {
        const synced = await syncUserDocument(fbUser);
        setProfile(synced);
      } catch (err) {
        console.error('Failed to sync user profile:', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const synced = await syncUserDocument(cred.user);
      setProfile(synced);
    } catch (err) {
      setAuthError(mapAuthError(err));
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const synced = await syncUserDocument(cred.user);
      setProfile(synced);
    } catch (err) {
      setAuthError(mapAuthError(err));
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      const synced = await syncUserDocument(cred.user, name.trim());
      setProfile(synced);
    } catch (err) {
      setAuthError(mapAuthError(err));
    }
  };

  const updateUserProfileName = async (name: string) => {
    if (!user) return;
    const clean = clampStr(name, 120);
    if (!clean) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: clean,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) => (prev ? { ...prev, name: clean } : prev));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        updateUserProfileName,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
