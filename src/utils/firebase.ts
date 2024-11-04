import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { type CaloriePreferences } from '../types';
import { type Recipe } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDCyZX1BlQXRnQ92xf-s-fHlMrsG4Dxmng",
  authDomain: "cellular-unity-440317-d2.firebaseapp.com",
  projectId: "cellular-unity-440317-d2",
  storageBucket: "cellular-unity-440317-d2.firebasestorage.app",
  messagingSenderId: "611379941787",
  appId: "1:611379941787:web:e19e37c1301df8f699d13e",
  measurementId: "G-DL9LGM6YB4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export interface UserData {
  username: string;
  email: string;
  isPremium: boolean;
  premiumSince?: string;
  stripeSessionId?: string;
  stripeSubscriptionActive?: boolean;
  stripeCustomerId?: string;
  savedRecipes: Recipe[];
  mealPlans: {
    date: string;
    meals: {
      breakfast: Recipe | null;
      lunch: Recipe | null;
      dinner: Recipe | null;
    };
  }[];
  preferences: {
    caloriePreferences?: CaloriePreferences;
    dietaryRestrictions: string[];
    servingSize: number;
    theme: 'light' | 'dark';
  };
  lastVerified?: string;
  createdAt: string;
  updatedAt: string;
}

export const updateUserData = async (userId: string, data: Partial<UserData>): Promise<boolean> => {
  if (!userId) throw new Error('User ID is required');
  
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    throw new Error('Failed to update user data');
  }
};

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
    return userCredential.user;
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please sign in instead.');
    }
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const signIn = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    const verificationResult = await verifyPremiumStatus(userCredential.user.uid);
    
    await updateDoc(doc(db, 'users', userCredential.user.uid), {
      isPremium: verificationResult.isPremium,
      lastVerified: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return userCredential.user;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
};

export const getUserData = async (userId: string, forceRefresh = false): Promise<UserData> => {
  if (!userId) throw new Error('User ID is required');

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data() as UserData;
    
    if (forceRefresh) {
      const verificationResult = await verifyPremiumStatus(userId);
      if (verificationResult.isPremium !== userData.isPremium) {
        await updateDoc(userRef, {
          isPremium: verificationResult.isPremium,
          lastVerified: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return { ...userData, isPremium: verificationResult.isPremium };
      }
    }
    
    return userData;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw new Error('Failed to get user data');
  }
};

export const addPremiumUser = async (email: string) => {
  if (!email) throw new Error('Email is required');

  try {
    const normalizedEmail = email.toLowerCase();
    
    if (!auth.currentUser) {
      throw new Error('No authenticated user found');
    }

    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const premiumUsersRef = collection(db, 'premiumUsers');
    const q = query(premiumUsersRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);

    let premiumDocId;

    if (!querySnapshot.empty) {
      premiumDocId = querySnapshot.docs[0].id;
      await updateDoc(doc(premiumUsersRef, premiumDocId), {
        active: true,
        updatedAt: new Date().toISOString(),
        stripeSubscriptionActive: true,
        userId: userId
      });
    } else {
      const premiumUserData = {
        email: normalizedEmail,
        userId: userId,
        active: true,
        stripeSubscriptionActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(premiumUsersRef);
      await setDoc(docRef, premiumUserData);
      premiumDocId = docRef.id;
    }

    await updateDoc(userRef, {
      isPremium: true,
      premiumSince: new Date().toISOString(),
      email: normalizedEmail,
      premiumDocId,
      stripeSubscriptionActive: true,
      updatedAt: new Date().toISOString(),
      lastVerified: new Date().toISOString()
    });

    const verificationResult = await verifyPremiumStatus(userId);
    if (!verificationResult.isPremium) {
      throw new Error('Premium status verification failed after update');
    }

    return true;
  } catch (error) {
    console.error('Error in addPremiumUser:', error);
    throw error;
  }
};

export const verifyPremiumStatus = async (userId: string) => {
  if (!userId) throw new Error('User ID is required');

  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getDoc(userRef);
    
    if (!userData.exists()) {
      throw new Error('User not found');
    }
    
    const user = userData.data();
    
    const premiumUsersRef = collection(db, 'premiumUsers');
    const q = query(
      premiumUsersRef,
      where('email', '==', user.email.toLowerCase()),
      where('active', '==', true),
      where('stripeSubscriptionActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const isPremium = !querySnapshot.empty;
    
    await updateDoc(userRef, {
      isPremium,
      lastVerified: new Date().toISOString(),
      stripeSubscriptionActive: isPremium,
      updatedAt: new Date().toISOString()
    });
    
    return {
      isPremium,
      lastVerified: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error verifying premium status:', error);
    throw new Error('Failed to verify premium status');
  }
};

export const saveRecipe = async (userId: string, recipe: Recipe) => {
  if (!userId) throw new Error('User ID is required');
  if (!recipe) throw new Error('Recipe is required');

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      savedRecipes: arrayUnion(recipe),
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw new Error('Failed to save recipe');
  }
};

export const removeRecipe = async (userId: string, recipeId: string) => {
  if (!userId) throw new Error('User ID is required');
  if (!recipeId) throw new Error('Recipe ID is required');

  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getDoc(userRef);
    if (!userData.exists()) throw new Error('User not found');

    const recipes = userData.data().savedRecipes;
    const recipeToRemove = recipes.find((r: Recipe) => r.id === recipeId);
    
    if (recipeToRemove) {
      await updateDoc(userRef, {
        savedRecipes: arrayRemove(recipeToRemove),
        updatedAt: new Date().toISOString()
      });
    }
    return true;
  } catch (error) {
    console.error('Error removing recipe:', error);
    throw new Error('Failed to remove recipe');
  }
};

export const saveMealPlan = async (userId: string, date: string, meals: {
  breakfast: Recipe | null;
  lunch: Recipe | null;
  dinner: Recipe | null;
}) => {
  if (!userId) throw new Error('User ID is required');
  if (!date) throw new Error('Date is required');
  if (!meals) throw new Error('Meals are required');

  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getDoc(userRef);
    if (!userData.exists()) throw new Error('User not found');

    const currentMealPlans = userData.data().mealPlans || [];
    const existingPlanIndex = currentMealPlans.findIndex((plan: any) => plan.date === date);

    if (existingPlanIndex >= 0) {
      currentMealPlans[existingPlanIndex] = { date, meals };
    } else {
      currentMealPlans.push({ date, meals });
    }

    await updateDoc(userRef, {
      mealPlans: currentMealPlans,
      updatedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error saving meal plan:', error);
    throw new Error('Failed to save meal plan');
  }
};

export const getMealPlan = async (userId: string, date: string) => {
  if (!userId) throw new Error('User ID is required');
  if (!date) throw new Error('Date is required');

  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getDoc(userRef);
    if (!userData.exists()) throw new Error('User not found');

    const mealPlans = userData.data().mealPlans || [];
    return mealPlans.find((plan: any) => plan.date === date);
  } catch (error) {
    console.error('Error getting meal plan:', error);
    throw new Error('Failed to get meal plan');
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