export interface Ingredient {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
}

export interface Recipe {
  id?: string;
  name: string;
  cookTime: number;
  servings: number;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: string[];
  instructions: string[];
  image?: string;
  matchingIngredients?: string[];
  totalIngredients?: number;
}

export interface CaloriePreferences {
  dailyTotal: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
}

export interface MealPlan {
  day: string;
  meals: {
    breakfast: Recipe;
    lunch: Recipe;
    dinner: Recipe;
    snacks: Recipe[];
  };
  totalCalories: number;
}

export interface UserPreferences {
  caloriePreferences: CaloriePreferences;
  dietaryRestrictions: string[];
  servingSize: number;
  theme: 'light' | 'dark';
}