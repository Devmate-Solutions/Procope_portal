'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaTooth, FaBell, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import { getCurrentUser, logout } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <FaTooth className="h-8 w-8 text-teal-600" />
                <span className="text-xl font-bold text-gray-800">{user?.workspaceName || 'Dashboard'}</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors">
              <FaBell className="h-5 w-5" />
            </button>

            {/* Workspace Badge */}
            {/* <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
              Azure Connected
            </span> */}

            {/* User Profile */}
            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
                <FaUserCircle className="h-8 w-8 text-gray-400" />
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-700">{user.displayName || 'User'}</p>
                </div>
                {/* Only show role badge for admin and owner (not subadmin) */}
                {(user.role === 'admin' || user.role === 'owner') && (
                  <Badge variant={user.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                    {user.role}
                  </Badge>
                )}
                {/* Logout Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1"
                >
                  <FaSignOutAlt className="h-3 w-3" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu - simplified for demo */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/"
            className={`block px-3 py-2 text-base font-medium ${
              isActive('/')
                ? 'text-teal-700 bg-teal-50'
                : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
} 