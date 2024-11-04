import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { logAnalyticsEvent } from './analytics';
import { verifyPremiumStatus } from './premium';
import type { UserData } from '../types/user';

export const createUser = async (email: string, password: string, username: string) => {
  if (!email || !password || !username) {
    throw new Error('Email, password, and username are required');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
    
    const isPremium = await verifyPremiumStatus(userCredential.user.uid);
    
    const userData: UserData = {
      username,
      email: email.toLowerCase(),
      isPremium: isPremium.isPremium,
      savedRecipes: [],
      mealPlans: [],
      preferences: {
        dietaryRestrictions: [],
        servingSize: 2,
        theme: 'light'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userData);

    logAnalyticsEvent('user_created', {
      userId: userCredential.user.uid,
      timestamp: new Date().toISOString()
    });

    return userCredential.user;
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const signIn = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    logAnalyticsEvent('user_signed_in', {
      userId: userCredential.user.uid,
      timestamp: new Date().toISOString()
    });
    
    return userCredential.user;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const signOut = async () => {
  try {
    const userId = auth.currentUser?.uid;
    await firebaseSignOut(auth);
    
    if (userId) {
      logAnalyticsEvent('user_signed_out', {
        userId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
};

const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'An error occurred. Please try again.';
  }
};