'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaTooth, FaBell, FaUserCircle } from 'react-icons/fa';

export default function Navbar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };
  
  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <FaTooth className="h-8 w-8 text-teal-600" />
                <span className="text-xl font-bold text-gray-800">DentCare</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors">
              <FaBell className="h-5 w-5" />
            </button>

            {/* API Status Badge */}
            <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${
              process.env.NEXT_PUBLIC_RETELL_API_KEY 
                ? 'bg-teal-50 text-teal-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {process.env.NEXT_PUBLIC_RETELL_API_KEY ? 'Connected' : 'Demo Mode'}
            </span>

            {/* User Profile */}
            <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
              <FaUserCircle className="h-8 w-8 text-gray-400" />
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">Dr. Smith</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
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