import React, { useState } from 'react';
import { X, User, Lock, Mail, Loader } from 'lucide-react';
import { createUser, signIn } from '../utils/firebase';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (error: any): string => {
    if (error?.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          setIsLogin(true);
          return 'This email is already registered. Please sign in instead.';
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          return 'Invalid email or password. Please try again.';
        case 'auth/invalid-email':
          return 'Please enter a valid email address.';
        case 'auth/weak-password':
          return 'Password should be at least 6 characters long.';
        case 'auth/too-many-requests':
          return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
          return 'Network error. Please check your connection and try again.';
        default:
          return 'An error occurred. Please try again.';
      }
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
      } else {
        await createUser(formData.email, formData.password, formData.username);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(isLogin ? 'Sign in error:' : 'Error creating user:', error);
      const message = getErrorMessage(error);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setFormData(prev => ({
      ...prev,
      password: ''
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none transition-all"
                  placeholder="Enter your username"
                  required
                  minLength={3}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none transition-all"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>{isLogin ? 'Sign In' : 'Create Account'}</>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={switchMode}
            className="text-green-600 hover:text-green-700 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;