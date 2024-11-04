import React, { useState } from 'react';
import { Activity, X } from 'lucide-react';
import { type CaloriePreferences } from '../types';

interface Props {
  preferences: CaloriePreferences;
  onSave: (preferences: CaloriePreferences) => void;
  onClose: () => void;
}

const CaloriePreferencesModal: React.FC<Props> = ({ preferences, onSave, onClose }) => {
  const [formData, setFormData] = useState<CaloriePreferences>(preferences);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof CaloriePreferences, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-800">Calorie Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daily Total Calories
            </label>
            <input
              type="number"
              value={formData.dailyTotal}
              onChange={(e) => handleChange('dailyTotal', e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
              min="1000"
              max="10000"
              step="50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Breakfast Calories
              </label>
              <input
                type="number"
                value={formData.breakfast}
                onChange={(e) => handleChange('breakfast', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
                min="0"
                max={formData.dailyTotal}
                step="50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lunch Calories
              </label>
              <input
                type="number"
                value={formData.lunch}
                onChange={(e) => handleChange('lunch', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
                min="0"
                max={formData.dailyTotal}
                step="50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dinner Calories
              </label>
              <input
                type="number"
                value={formData.dinner}
                onChange={(e) => handleChange('dinner', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
                min="0"
                max={formData.dailyTotal}
                step="50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Snacks Calories
              </label>
              <input
                type="number"
                value={formData.snacks}
                onChange={(e) => handleChange('snacks', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
                min="0"
                max={formData.dailyTotal}
                step="50"
                required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Save Preferences
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaloriePreferencesModal;