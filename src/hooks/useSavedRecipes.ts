import { useState, useEffect } from 'react';
import { auth, getUserData, saveRecipe as saveRecipeToFirebase, removeRecipe as removeRecipeFromFirebase } from '../utils/firebase';
import { type Recipe } from '../types';

export function useSavedRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecipes = async () => {
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await getUserData(auth.currentUser.uid);
        setRecipes(userData.savedRecipes || []);
      } catch (err) {
        console.error('Error loading recipes:', err);
        setError('Failed to load saved recipes');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipes();
  }, []);

  const saveRecipe = async (recipe: Recipe) => {
    if (!auth.currentUser) throw new Error('Must be signed in to save recipes');

    try {
      await saveRecipeToFirebase(auth.currentUser.uid, recipe);
      setRecipes(prev => [...prev, recipe]);
    } catch (err) {
      console.error('Error saving recipe:', err);
      throw err;
    }
  };

  const removeRecipe = async (recipeId: string) => {
    if (!auth.currentUser) throw new Error('Must be signed in to remove recipes');

    try {
      await removeRecipeFromFirebase(auth.currentUser.uid, recipeId);
      setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
    } catch (err) {
      console.error('Error removing recipe:', err);
      throw err;
    }
  };

  return { recipes, isLoading, error, saveRecipe, removeRecipe };
}