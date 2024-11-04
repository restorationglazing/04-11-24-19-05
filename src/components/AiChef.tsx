import React, { useState } from 'react';
import { ChefHat, ArrowLeft, Wand2, Clock, Users, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateCustomRecipe } from '../utils/openai';
import { auth, getUserData } from '../utils/firebase';

interface Recipe {
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
}

const AiChef: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGetRecipe = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const userData = auth.currentUser ? await getUserData(auth.currentUser.uid) : null;
      const dailyCalories = userData?.preferences?.dailyCalories || 2000;
      const generatedRecipe = await generateCustomRecipe(prompt, dailyCalories);
      setRecipe(generatedRecipe);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get recipe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate('/success')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800">AI Chef</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to cook?
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., 'I want a healthy chicken recipe' or 'How do I make a perfect risotto?'"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all min-h-[100px]"
          />
        </div>

        <button
          onClick={handleGetRecipe}
          disabled={isLoading || !prompt.trim()}
          className={`w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 ${
            isLoading || !prompt.trim() ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          <Wand2 className="w-5 h-5" />
          {isLoading ? 'Getting Recipe...' : 'Get Recipe'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {recipe && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{recipe.name}</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Cook Time</span>
                </div>
                <p className="font-semibold">{recipe.cookTime} mins</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Servings</span>
                </div>
                <p className="font-semibold">{recipe.servings}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Scale className="w-4 h-4" />
                  <span className="text-sm">Calories</span>
                </div>
                <p className="font-semibold">{recipe.calories} kcal</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <ChefHat className="w-4 h-4" />
                  <span className="text-sm">Macros</span>
                </div>
                <div className="text-sm">
                  <span className="text-blue-600">{recipe.macros.protein}g P</span> •{' '}
                  <span className="text-green-600">{recipe.macros.carbs}g C</span> •{' '}
                  <span className="text-yellow-600">{recipe.macros.fat}g F</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
              <ul className="list-disc list-inside space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="text-gray-700">{ingredient}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Instructions</h3>
              <ol className="list-decimal list-inside space-y-3">
                {recipe.instructions.map((step, index) => (
                  <li key={index} className="text-gray-700">{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiChef;