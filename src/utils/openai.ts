import OpenAI from 'openai';
import { type Ingredient } from '../types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
});

export async function generateRecipe(ingredients: Ingredient[]) {
  const ingredientList = ingredients.map(ing => ing.name).join(', ');
  const timestamp = Date.now();
  
  try {
    const completion = await openai.chat.completions.create({
      messages: [{
        role: "system",
        content: `You are a helpful chef that suggests recipes based on available ingredients. Current timestamp: ${timestamp}. Always provide unique suggestions. Format the response as JSON with the following structure: { "name": string, "cookTime": number, "servings": number, "calories": number, "macros": { "protein": number, "carbs": number, "fat": number }, "ingredients": string[], "instructions": string[] }`
      }, {
        role: "user",
        content: `Suggest a unique recipe I can make with some or all of these ingredients: ${ingredientList}. Include additional common ingredients if needed. Return response in JSON format.`
      }],
      model: "gpt-3.5-turbo-0125",
      response_format: { type: "json_object" },
      temperature: 0.9,
      presence_penalty: 0.6,
      frequency_penalty: 0.6
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error generating recipe:', error);
    throw error;
  }
}

export async function generateCustomRecipe(prompt: string, targetCalories: number) {
  const timestamp = Date.now();
  
  try {
    const completion = await openai.chat.completions.create({
      messages: [{
        role: "system",
        content: `You are a professional chef providing detailed cooking instructions. Current timestamp: ${timestamp}. Format the response as JSON with the following structure: { "name": string, "cookTime": number, "servings": number, "calories": number, "macros": { "protein": number, "carbs": number, "fat": number }, "ingredients": string[], "instructions": string[] }`
      }, {
        role: "user",
        content: `Create a recipe for ${prompt} targeting ${targetCalories} calories per serving. Return response in JSON format.`
      }],
      model: "gpt-3.5-turbo-0125",
      response_format: { type: "json_object" },
      temperature: 0.9,
      presence_penalty: 0.6,
      frequency_penalty: 0.6
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error generating custom recipe:', error);
    throw error;
  }
}

interface DailyMeals {
  meals: {
    breakfast: {
      name: string;
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fat: number;
      };
    };
    lunch: {
      name: string;
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fat: number;
      };
    };
    dinner: {
      name: string;
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fat: number;
      };
    };
  };
  totalCalories: number;
}

export async function generateDailyMeals(date: string, targetCalories: number): Promise<DailyMeals> {
  const timestamp = Date.now();
  
  try {
    const completion = await openai.chat.completions.create({
      messages: [{
        role: "system",
        content: `You are a nutritionist creating meal plans. Current timestamp: ${timestamp}. Format the response as JSON with the following structure: { "meals": { "breakfast": { "name": string, "calories": number, "macros": { "protein": number, "carbs": number, "fat": number } }, "lunch": { "name": string, "calories": number, "macros": { "protein": number, "carbs": number, "fat": number } }, "dinner": { "name": string, "calories": number, "macros": { "protein": number, "carbs": number, "fat": number } } }, "totalCalories": number }`
      }, {
        role: "user",
        content: `Create a balanced meal plan for ${date} targeting ${targetCalories} total daily calories. Distribute calories appropriately across meals. Return response in JSON format.`
      }],
      model: "gpt-3.5-turbo-0125",
      response_format: { type: "json_object" },
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.6
    });

    const response = JSON.parse(completion.choices[0].message.content);
    
    if (!response.meals || !response.meals.breakfast || !response.meals.lunch || !response.meals.dinner) {
      throw new Error('Invalid meal plan format received');
    }

    return response;
  } catch (error) {
    console.error('Error generating daily meals:', error);
    throw new Error('Failed to generate meal plan. Please try again.');
  }
}

export async function generateShoppingList(meals: string[], servings: number) {
  const timestamp = Date.now();
  
  try {
    const completion = await openai.chat.completions.create({
      messages: [{
        role: "system",
        content: `You are a helpful chef creating organized shopping lists. Current timestamp: ${timestamp}. Format the response as JSON with the following structure: { "categories": [{ "name": string, "items": string[] }] }`
      }, {
        role: "user",
        content: `Create a detailed shopping list with exact quantities for these meals (${servings} servings each): ${meals.join(', ')}. Group items by category (Produce, Meat & Seafood, Dairy & Eggs, Pantry, etc). Return response in JSON format.`
      }],
      model: "gpt-3.5-turbo-0125",
      response_format: { type: "json_object" },
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.6
    });

    const response = JSON.parse(completion.choices[0].message.content);
    if (!response.categories || !Array.isArray(response.categories)) {
      throw new Error('Invalid shopping list format received');
    }

    return response.categories;
  } catch (error) {
    console.error('Error generating shopping list:', error);
    throw new Error('Failed to generate shopping list. Please try again.');
  }
}