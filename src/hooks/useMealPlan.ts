import { useState, useEffect } from 'react';
import { auth, getMealPlan, saveMealPlan as saveMealPlanToFirebase } from '../utils/firebase';
import { type Recipe } from '../types';

interface MealPlan {
  breakfast: Recipe | null;
  lunch: Recipe | null;
  dinner: Recipe | null;
}

export function useMealPlan(date: string) {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMealPlan = async () => {
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const plan = await getMealPlan(auth.currentUser.uid, date);
        setMealPlan(plan?.meals || null);
      } catch (err) {
        console.error('Error loading meal plan:', err);
        setError('Failed to load meal plan');
      } finally {
        setIsLoading(false);
      }
    };

    loadMealPlan();
  }, [date]);

  const saveMealPlan = async (meals: MealPlan) => {
    if (!auth.currentUser) throw new Error('Must be signed in to save meal plan');

    try {
      await saveMealPlanToFirebase(auth.currentUser.uid, date, meals);
      setMealPlan(meals);
    } catch (err) {
      console.error('Error saving meal plan:', err);
      throw err;
    }
  };

  return { mealPlan, isLoading, error, saveMealPlan };
}