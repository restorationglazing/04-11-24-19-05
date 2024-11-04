import React, { useState } from 'react';
import { Calendar, ArrowLeft, Plus, Trash2, Save, RefreshCw, ChevronLeft, ChevronRight, BookOpen, Pin, ShoppingBag, Users, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateDailyMeals, generateCustomRecipe, generateShoppingList } from '../utils/openai';
import { useSavedRecipes } from '../hooks/useSavedRecipes';
import ShoppingListModal from './ShoppingListModal';
import ServingsModal from './ServingsModal';

interface Meal {
  id: string;
  date: string;
  type: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  isPinned?: boolean;
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

const MealPlanner: React.FC = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showServingsModal, setShowServingsModal] = useState(true);
  const [servings, setServings] = useState(2);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [shoppingList, setShoppingList] = useState<{ category: string; items: string[] }[]>([]);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const navigate = useNavigate();
  const { saveRecipe } = useSavedRecipes();

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleGenerateShoppingList = async () => {
    if (meals.length === 0) return;
    
    setIsGeneratingList(true);
    try {
      const mealNames = meals.map(meal => `${meal.name} (${meal.calories} calories, for ${servings} people)`);
      const list = await generateShoppingList(mealNames, servings);
      setShoppingList(list);
      setShowShoppingList(true);
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
    } finally {
      setIsGeneratingList(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const dateStr = formatDate(currentDate);
      const dailyPlan = await generateDailyMeals(dateStr, targetCalories);
      
      if (!dailyPlan?.meals) {
        throw new Error('Invalid meal plan data received');
      }

      // Keep pinned meals, replace unpinned ones
      const newMeals = meals.filter(meal => 
        meal.date === dateStr && meal.isPinned
      );

      // Add new meals for each type that isn't pinned
      MEAL_TYPES.forEach(type => {
        const isPinned = newMeals.some(m => m.type === type);
        if (!isPinned && dailyPlan.meals[type]) {
          newMeals.push({
            id: `${dateStr}-${type}-${Date.now()}`,
            date: dateStr,
            type,
            name: dailyPlan.meals[type].name,
            calories: dailyPlan.meals[type].calories,
            macros: dailyPlan.meals[type].macros,
            isPinned: false
          });
        }
      });

      setMeals(prev => [
        ...prev.filter(m => m.date !== dateStr),
        ...newMeals
      ]);
    } catch (error) {
      console.error('Error generating daily meals:', error);
      setError('Failed to generate meal plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecipe = async (meal: Meal) => {
    setIsSaving(meal.id);
    try {
      const recipeDetails = await generateCustomRecipe(
        `Generate a detailed recipe for ${meal.name} to serve ${servings} people targeting ${meal.calories} calories per serving`,
        meal.calories
      );
      
      saveRecipe({
        name: meal.name,
        mealType: `${meal.date} - ${meal.type} (${meal.calories} cal, ${servings} servings)`,
        ingredients: recipeDetails.ingredients.join('\n'),
        instructions: recipeDetails.instructions.join('\n')
      });
    } catch (error) {
      console.error('Failed to save recipe:', error);
    } finally {
      setIsSaving(null);
    }
  };

  const handlePinMeal = (id: string) => {
    setMeals(meals.map(meal => 
      meal.id === id ? { ...meal, isPinned: !meal.isPinned } : meal
    ));
  };

  const handleAddMeal = (type: 'breakfast' | 'lunch' | 'dinner') => {
    const dateStr = formatDate(currentDate);
    const newMeal = {
      id: `${dateStr}-${type}-${Date.now()}`,
      date: dateStr,
      type,
      name: '',
      calories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 },
      isPinned: false
    };
    setMeals([...meals, newMeal]);
  };

  const handleUpdateMeal = (id: string, name: string) => {
    setMeals(meals.map(meal => 
      meal.id === id ? { ...meal, name } : meal
    ));
  };

  const handleRemoveMeal = (id: string) => {
    setMeals(meals.filter(meal => meal.id !== id));
  };

  const getMealsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return MEAL_TYPES.map(type => {
      const meal = meals.find(m => m.date === dateStr && m.type === type);
      return { type, meal };
    });
  };

  const handlePreviousDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 1);
      return newDate;
    });
  };

  const hasUnpinnedMeals = meals.some(meal => !meal.isPinned);

  if (showServingsModal) {
    return (
      <ServingsModal
        servings={servings}
        onServingsChange={setServings}
        onClose={() => setShowServingsModal(false)}
        targetCalories={targetCalories}
        onCaloriesChange={setTargetCalories}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/success')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-800">Meal Planner</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowServingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">{servings} {servings === 1 ? 'Person' : 'People'}</span>
            <span className="sm:hidden">{servings}</span>
          </button>
          <button
            onClick={() => setShowServingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Scale className="w-5 h-5" />
            <span>{targetCalories} cal</span>
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <button
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className={`w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 ${
            isGenerating ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {isGenerating ? 'Generating Plan...' : hasUnpinnedMeals ? 'Re-generate Unselected Meals' : 'Generate Meal Plan'}
          </span>
          <span className="sm:hidden">
            {isGenerating ? 'Generating...' : 'Generate'}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleGenerateShoppingList}
            disabled={isGeneratingList || meals.length === 0}
            className={`w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 ${
              isGeneratingList || meals.length === 0 ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="hidden sm:inline">
              {isGeneratingList ? 'Generating List...' : 'Shopping List'}
            </span>
            <span className="inline sm:hidden">List</span>
          </button>

          <button
            onClick={() => navigate('/recipe-book')}
            className="w-full px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden sm:inline">Recipe Book</span>
            <span className="inline sm:hidden">Book</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousDay}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <h3 className="text-xl font-semibold text-white">{formatDate(currentDate)}</h3>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {getMealsForDate(currentDate).map(({ type, meal }) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-700 capitalize">
                  {type}
                </h4>
                {!meal && (
                  <button
                    onClick={() => handleAddMeal(type)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-400" />
                  </button>
                )}
              </div>
              {meal ? (
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => handleUpdateMeal(meal.id, e.target.value)}
                      placeholder="Enter meal..."
                      className={`w-full px-4 py-3 text-base border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all ${
                        meal.isPinned ? 'bg-purple-50 border-purple-200' : ''
                      }`}
                    />
                    {meal.calories > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {meal.calories} calories | P: {meal.macros.protein}g C: {meal.macros.carbs}g F: {meal.macros.fat}g
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handlePinMeal(meal.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      meal.isPinned 
                        ? 'bg-purple-100 text-purple-600' 
                        : 'hover:bg-purple-50 text-gray-400'
                    }`}
                    title={meal.isPinned ? 'Unpin from planner' : 'Pin to planner'}
                  >
                    <Pin className={`w-5 h-5 ${meal.isPinned ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleSaveRecipe(meal)}
                    disabled={isSaving === meal.id}
                    className={`p-2 hover:bg-green-50 rounded-lg transition-colors ${
                      isSaving === meal.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Save to recipe book"
                  >
                    <Save className={`w-5 h-5 text-green-600 ${
                      isSaving === meal.id ? 'animate-pulse' : ''
                    }`} />
                  </button>
                  <button
                    onClick={() => handleRemoveMeal(meal.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove meal"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              ) : (
                <div className="h-14 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                  No meal planned
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showShoppingList && (
        <ShoppingListModal
          shoppingList={shoppingList}
          servings={servings}
          onClose={() => setShowShoppingList(false)}
        />
      )}
    </div>
  );
};

export default MealPlanner;