'use client';

import React, { useState, useEffect } from 'react';

interface AuthLoadingOverlayProps {
  isVisible: boolean;
}

export const AuthLoadingOverlay: React.FC<AuthLoadingOverlayProps> = ({ isVisible }) => {
  const [message, setMessage] = useState('Authenticating...');
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setMessage('Authenticating...');
      setShowProgress(false);
      return;
    }

    const timer1 = setTimeout(() => {
      setMessage('Verifying your session...');
      setShowProgress(true);
    }, 3000);

    const timer2 = setTimeout(() => {
      setMessage('Almost ready...');
    }, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm mx-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Animated loading spinner */}
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          {/* Loading text */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {message}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please wait while we verify your session
            </p>
            {showProgress && (
              <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-3/5"></div>
              </div>
            )}
          </div>
          
          {/* Progress dots */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
