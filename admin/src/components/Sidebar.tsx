"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { getAllowedNavigation } from "@/lib/roleUtils";
import Image from "next/image";
import ProfileDropdown from "./ProfileDropdown";
import {
  LayoutDashboard,
  Building2,
  User,
  LogOut,
  X,
  Sparkles,
  GitBranch,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-celestial-400",
    route: "dashboard",
  },
  {
    name: "Organization",
    href: "/organization",
    icon: Building2,
    color: "text-yellowgreen-400",
    route: "organization",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    color: "text-citrine-400",
    route: "analytics",
  },
  {
    name: "Tree View",
    href: "/tree",
    icon: GitBranch,
    color: "text-purple-400",
    route: "tree",
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { userProfile, signOut } = useAuth();
  const { userRole } = useRolePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const [logoError, setLogoError] = useState(false);

  // Filter navigation items based on user role
  const allowedRoutes = getAllowedNavigation(userRole);
  const filteredNavigationItems = navigationItems.filter((item) =>
    allowedRoutes.includes(item.route)
  );

  const handleEditProfile = () => {
    router.push("/profile");
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-br from-celestial-600 via-french-600 to-celestial-700 transform transition-all duration-300 ease-out shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellowgreen-400/10 rounded-full -ml-12 -mb-12"></div>

          {/* Header */}
          <div className="relative flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-sm">
            <div className="flex items-center space-x-3 fade-in">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 bg-white rounded-xl shadow-lg"></div>
                {!logoError ? (
                  <Image
                    src="/Logo.png"
                    alt="Smart Queue Logo"
                    width={48}
                    height={48}
                    className="relative w-12 h-12 object-contain p-1"
                    onError={(e) => {
                      console.error("Logo failed to load:", e);
                      setLogoError(true);
                    }}
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="relative w-12 h-12 flex items-center justify-center bg-gradient-to-br from-celestial-500 to-french-blue-600 rounded-xl text-white font-bold text-lg shadow-lg">
                    SQ
                  </div>
                )}
              </div>
              <div>
                <div className="font-bold text-2xl tracking-wide">
                  <span className="text-black">Smart</span>
                  <span className="text-blue-200">Queue</span>
                </div>
                <div className="flex items-center space-x-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-citrine-400" />
                  <span className="text-white/70 text-xs font-medium">
                    Admin Portal
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Organization Badge */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              {/* Organization Logo */}
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
                {userProfile?.organization?.logo_url ? (
                  <img
                    src={userProfile.organization.logo_url}
                    alt="Organization Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-caramel-400 to-caramel-500 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-lg">
                    {userProfile?.organization?.name?.charAt(0) || "O"}
                  </div>
                )}
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold block text-white">
                  {userProfile?.organization?.name || "Organization"}
                </span>
                <span className="text-white/60 text-xs">Active workspace</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <div className="mb-6">
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center space-x-2">
                <span>Navigation</span>
                <div className="flex-1 h-px bg-white/20"></div>
              </h3>
              <ul className="space-y-2">
                {filteredNavigationItems.map((item, index) => {
                  const isActive = pathname === item.href;
                  return (
                    <li
                      key={item.name}
                      className={`slide-in-left animation-delay-${index}`}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "nav-item relative group",
                          isActive && "active"
                        )}
                        onClick={onClose}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm"></div>
                        )}
                        <div className="relative flex items-center space-x-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                              isActive
                                ? "bg-white text-celestial-600 shadow-lg"
                                : "bg-white/10 text-white group-hover:bg-white/20"
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-citrine-400 rounded-full shadow-glow"></div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* User Profile */}
          <div className="p-6 border-t border-white/10 backdrop-blur-sm">
            <ProfileDropdown
              userProfile={userProfile}
              onEditProfile={handleEditProfile}
              onSignOut={signOut}
            />
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden fade-in"
          onClick={onClose}
        />
      )}
    </>
  );
}
