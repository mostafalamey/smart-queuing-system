'use client';

import React from 'react';
import { AlertTriangle, X, RefreshCw, Trash2 } from 'lucide-react';
import Portal from './Portal';

interface ResetQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetOnly: () => void;
  onResetWithCleanup: () => void;
  queueName?: string;
}

export default function ResetQueueModal({
  isOpen,
  onClose,
  onResetOnly,
  onResetWithCleanup,
  queueName = 'queue'
}: ResetQueueModalProps) {
  if (!isOpen) return null;

  const handleResetOnly = () => {
    onResetOnly();
    onClose();
  };

  const handleResetWithCleanup = () => {
    onResetWithCleanup();
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 transform transition-all">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-6">
              {/* Icon and Title */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center border border-red-200">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Reset Queue
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose how you want to reset the {queueName}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  This will cancel all waiting tickets in the queue. Choose your preferred reset option:
                </p>
              </div>

              {/* Action Options */}
              <div className="space-y-3 mb-6">
                {/* Basic Reset Option */}
                <button
                  onClick={handleResetOnly}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <RefreshCw className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">Reset Queue Only</h4>
                      <p className="text-sm text-gray-600">
                        Cancel all waiting tickets and reset the queue. Quick and simple.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Reset with Cleanup Option */}
                <button
                  onClick={handleResetWithCleanup}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">Reset + Cleanup Database</h4>
                      <p className="text-sm text-gray-600">
                        Reset queue AND delete all completed/cancelled tickets for optimal performance.
                      </p>
                      <p className="text-xs text-red-500 mt-1 font-medium">
                        Recommended for maximum system performance
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Cancel button */}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
