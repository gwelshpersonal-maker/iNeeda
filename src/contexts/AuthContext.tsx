
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { useData } from './DataContext';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset, User as FirebaseUser, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<FirebaseUser>;
  loginWithGoogle: () => Promise<FirebaseUser>;
  signup: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  isAdmin: boolean;
  isManager: boolean; 
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, isLoading: isDataLoading } = useData();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncTimeoutExpired, setSyncTimeoutExpired] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult();
          setIsAdmin(!!idTokenResult.claims.admin);
          setIsManager(!!idTokenResult.claims.manager || !!idTokenResult.claims.admin);
        } catch (error) {
          console.error("Failed to parse custom claims:", error);
        }
      } else {
        setIsAdmin(false);
        setIsManager(false);
      }
      setAuthLoading(false);
      setSyncTimeoutExpired(false); // Reset timeout on auth change
    });
    return () => unsubscribe();
  }, []);

  const currentUserId = firebaseUser?.uid || null;
  const currentUser = users.find(u => u.id === currentUserId) || null;

  const isSyncing = !!(firebaseUser && !isDataLoading && !currentUser && !syncTimeoutExpired);

  useEffect(() => {
    if (isSyncing) {
       const timer = setTimeout(() => setSyncTimeoutExpired(true), 3000); // 3 second grace period
       return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  const isLoading = authLoading || isDataLoading || isSyncing;

  const login = async (email: string, password?: string) => {
    if (password) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } else {
      throw new Error("Password is required for login.");
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signup = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const confirmPasswordResetAction = async (code: string, newPassword: string) => {
    await confirmPasswordReset(auth, code, newPassword);
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  // Strict Manager Check: Handled by custom claims inside state above.
  // We keep the currentUser.role as a fallback for UI rendering, but claims verify backend actions.
  const uiIsManager = isManager || currentUser?.role === Role.ADMIN || currentUser?.role === Role.MANAGER; 
  const uiIsAdmin = isAdmin || currentUser?.role === Role.ADMIN;

  return (
    <AuthContext.Provider value={{ currentUser, login, loginWithGoogle, signup, logout, resetPassword, confirmPasswordReset: confirmPasswordResetAction, isManager: uiIsManager, isAdmin: uiIsAdmin, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
