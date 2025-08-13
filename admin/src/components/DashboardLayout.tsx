'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import Image from 'next/image'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Sidebar Component */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 transition-all duration-300">
        {/* Enhanced Mobile Header */}
        <div className="lg:hidden bg-white/80 backdrop-blur-md border-b border-gray-200/60 px-4 py-3 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="relative p-2 text-gray-600 hover:text-celestial-600 hover:bg-celestial-50 rounded-xl transition-all duration-200 group"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6 transform group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-celestial-100 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
            </button>
            
            {/* Enhanced Mobile Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-celestial-400 to-french-blue-500 rounded-lg blur-sm opacity-60"></div>
                <div className="relative w-8 h-8 bg-gradient-to-br from-celestial-500 to-french-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Image
                    src="/logo_s.png"
                    alt="Smart Queue Logo"
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain filter brightness-0 invert"
                  />
                </div>
              </div>
              <span className="font-bold text-gray-900 text-lg bg-gradient-to-r from-celestial-600 to-french-blue-600 bg-clip-text text-transparent">
                Smart Queue
              </span>
            </div>
            
            <div className="w-10 h-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page Content with Enhanced Animations */}
        <main className="flex-1 transition-all duration-300">
          <div className="page-enter page-enter-active">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
