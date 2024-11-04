import { useState, useEffect } from 'react';
import { type MealPlan } from '../types';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useMealPlanCache() {
  const [cache, setCache] = useState<Record<string, { plan: MealPlan; timestamp: number }>>(() => {
    const saved = localStorage.getItem('mealPlanCache');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('mealPlanCache', JSON.stringify(cache));
  }, [cache]);

  const getCachedPlan = (date: string) => {
    const cached = cache[date];
    if (!cached) return null;

    // Check if cache is still valid (within 24 hours)
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      const newCache = { ...cache };
      delete newCache[date];
      setCache(newCache);
      return null;
    }

    return cached.plan;
  };

  const cachePlan = (date: string, plan: MealPlan) => {
    setCache(prev => ({
      ...prev,
      [date]: {
        plan,
        timestamp: Date.now()
      }
    }));
  };

  return { getCachedPlan, cachePlan };
}