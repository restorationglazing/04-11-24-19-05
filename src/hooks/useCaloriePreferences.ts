import { useState, useEffect } from 'react';
import { type CaloriePreferences } from '../types';

const DEFAULT_PREFERENCES: CaloriePreferences = {
  dailyTotal: 2000,
  breakfast: 500,
  lunch: 600,
  dinner: 700,
  snacks: 200
};

export function useCaloriePreferences() {
  const [preferences, setPreferences] = useState<CaloriePreferences>(() => {
    const saved = localStorage.getItem('caloriePreferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    localStorage.setItem('caloriePreferences', JSON.stringify(preferences));
  }, [preferences]);

  return { preferences, setPreferences };
}