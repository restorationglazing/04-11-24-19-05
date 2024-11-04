import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { getUserData } from '../services/user';
import { verifyPremiumStatus } from '../services/premium';
import type { UserData } from '../types/user';

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const loadUserData = async () => {
      if (!auth.currentUser) {
        if (mounted) {
          setIsLoading(false);
          setUserData(null);
        }
        return;
      }

      try {
        setError(null);
        const data = await getUserData(auth.currentUser.uid);
        
        // Verify premium status on load
        const premiumStatus = await verifyPremiumStatus(auth.currentUser.uid);
        
        if (mounted) {
          setUserData({
            ...data,
            isPremium: premiumStatus.isPremium,
            lastVerified: premiumStatus.lastVerified
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(loadUserData, retryDelay * retryCount);
          return;
        }

        if (mounted) {
          setError('Failed to load user data. Please try refreshing the page.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadUserData();
      } else {
        if (mounted) {
          setUserData(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const refreshUserData = async () => {
    if (!auth.currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getUserData(auth.currentUser.uid, true);
      const premiumStatus = await verifyPremiumStatus(auth.currentUser.uid);
      
      setUserData({
        ...data,
        isPremium: premiumStatus.isPremium,
        lastVerified: premiumStatus.lastVerified
      });
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setError('Failed to refresh user data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userData,
    isLoading,
    error,
    refreshUserData
  };
}