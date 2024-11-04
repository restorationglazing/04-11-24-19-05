import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { verifyPremiumStatus } from './premium';
import { logAnalyticsEvent } from './analytics';
import { UserData } from '../types/user';

export const getUserData = async (userId: string, forceRefresh = false): Promise<UserData> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data() as UserData;
    
    if (forceRefresh) {
      try {
        const verificationResult = await verifyPremiumStatus(userId);
        if (verificationResult.isPremium !== userData.isPremium) {
          await updateDoc(userRef, {
            isPremium: verificationResult.isPremium,
            lastVerified: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          return { ...userData, isPremium: verificationResult.isPremium };
        }
      } catch (verifyError) {
        console.error('Error verifying premium status:', verifyError);
        // Continue with existing data if verification fails
      }
    }
    
    return userData;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get user data');
  }
};

export const updateUserData = async (userId: string, data: Partial<UserData>) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });

    logAnalyticsEvent('user_data_updated', {
      userId,
      updatedFields: Object.keys(data),
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update user data');
  }
};