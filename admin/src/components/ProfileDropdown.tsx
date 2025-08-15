'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface ProfileDropdownProps {
  userProfile: any;
  onEditProfile: () => void;
  onSignOut: () => void;
}

export default function ProfileDropdown({ userProfile, onEditProfile, onSignOut }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEditProfile = () => {
    setIsOpen(false);
    onEditProfile();
  };

  const handleSignOutClick = () => {
    setIsOpen(false);
    setShowSignOutConfirm(true);
  };

  const handleConfirmSignOut = () => {
    onSignOut();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center space-x-6 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200"
      >
        <div className="relative">
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt="Profile"
              className="w-16 h-16 rounded-xl object-cover shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-caramel-400 to-caramel-500 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellowgreen-400 rounded-full border-2 border-white/20"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col items-start">
            <p className="text-white text-sm font-semibold truncate">
              {userProfile?.name || 'User'}
            </p>
            <span className="text-white/60 text-xs capitalize bg-white/10 px-2 py-1 rounded-md mt-1">
              {userProfile?.role || 'Role'}
            </span>
            <p className="text-white/60 text-xs mt-2">
              {userProfile?.email || 'user@example.com'}
            </p>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={handleEditProfile}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors duration-150"
          >
            <Settings className="w-4 h-4" />
            Edit Profile
          </button>
          <button
            onClick={handleSignOutClick}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleConfirmSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to log in again to access the admin dashboard."
        confirmText="Sign Out"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
}
