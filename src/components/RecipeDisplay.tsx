import React from 'react';
import { Clock, Users, Scale } from 'lucide-react';

interface Recipe {
  name: string;
  cookTime: number;
  servings: number;
  calories: number;
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: string[];
  instructions: string[];
}

interface Props {
  recipe: Recipe;
  className?: string;
}

const RecipeDisplay: React.FC<Props> = ({ recipe, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">{recipe.name}</h2>
        
        <div className="flex flex-wrap gap-4 mb-6 text-gray-600">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>{recipe.cookTime} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>{recipe.servings} servings</span>
          </div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            <span>{recipe.calories} calories per serving</span>
          </div>
        </div>

        {recipe.macros && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Nutritional Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Protein</div>
                <div className="font-semibold text-gray-800">{recipe.macros.protein}g</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Carbs</div>
                <div className="font-semibold text-gray-800">{recipe.macros.carbs}g</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Fat</div>
                <div className="font-semibold text-gray-800">{recipe.macros.fat}g</div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Ingredients</h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="text-gray-600">
                {ingredient}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Instructions</h3>
          <ol className="space-y-3">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="text-gray-600">
                <span className="font-medium text-gray-800">{index + 1}.</span>{' '}
                {instruction}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RecipeDisplay;