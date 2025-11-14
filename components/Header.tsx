'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: 'ADMIN' | 'COLLABORATOR';
  };
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="bg-[#0A4056] w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="cursor-pointer">
              <img
                src="/blox-logo-white.svg"
                alt="BLOX AI Logo"
                className="h-8 w-auto"
              />
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/dashboard'
                    ? 'bg-[#107EAA] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-[#107EAA]/20'
                }`}
              >
                Documents
              </Link>
              {user?.role === 'ADMIN' && (
                <>
                  <Link
                    href="/users"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/users'
                        ? 'bg-[#107EAA] text-white'
                        : 'text-gray-300 hover:text-white hover:bg-[#107EAA]/20'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    href="/audit-logs"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/audit-logs'
                        ? 'bg-[#107EAA] text-white'
                        : 'text-gray-300 hover:text-white hover:bg-[#107EAA]/20'
                    }`}
                  >
                    Audit Logs
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Right side - User info and menu */}
          <div className="flex items-center space-x-4">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 text-white hover:bg-[#107EAA]/20 rounded-md px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-[#107EAA] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() ||
                      user?.email?.charAt(0)?.toUpperCase() ||
                      'U'}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">
                    {user?.name || 'Admin User'}
                  </div>
                  <div className="text-xs text-gray-300">{user?.email}</div>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* User dropdown menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <Link
                    href="/change-password"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                      <span>Change Password</span>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
