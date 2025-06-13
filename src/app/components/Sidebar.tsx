'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  FaPhoneAlt,
  FaHistory,
  FaChartLine,
  FaBars,
  FaTimes,
  FaUsers,
  FaUserPlus
} from 'react-icons/fa';
import { getCurrentUser } from '@/lib/auth';
import logo from '../../../public/logov2.png';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const menuItems: SidebarItem[] = [
    { name: 'Dashboard', path: '/', icon: <FaChartLine className="w-5 h-5" /> },
    { name: 'Create Calls', path: '/create-calls', icon: <FaPhoneAlt className="w-5 h-5" /> },
    { name: 'Call History', path: '/call-history', icon: <FaHistory className="w-5 h-5" /> },
    { name: 'Call Analytics', path: '/analytics', icon: <FaChartLine className="w-5 h-5" /> },
  ];

  // Admin/Owner only menu items
  const adminMenuItems: SidebarItem[] = [
    { name: 'User Management', path: '/user-management', icon: <FaUsers className="w-5 h-5" /> },
    { name: 'Add User', path: '/add-user', icon: <FaUserPlus className="w-5 h-5" /> },
  ];

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <div 
      className={`bg-white border-r border-gray-100 h-full transition-all duration-300 shadow-sm
      ${collapsed ? 'w-20' : 'w-64'}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex justify-center mb-4">
           <h1 className=' text-[#1F4280] font-bold text-2xl'>MyDent.AI</h1>
          </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          {collapsed ? <FaBars className="w-5 h-5" /> : <FaTimes className="w-5 h-5" />}
        </button>
      </div>

      <nav className="mt-6 px-2">
        {/* Main Menu Items */}
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors
                  ${isActive(item.path)
                    ? 'bg-[#1F4280]/10 text-[#1F4280]'
                    : 'text-gray-600 hover:bg-[#1F4280]/5 hover:text-[#1F4280]'
                  }`}
              >
                <span className="flex items-center justify-center w-5 h-5 mr-3">
                  {item.icon}
                </span>
                {!collapsed && <span className="font-medium">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {/* Admin/Owner Only Section */}
        {user && (user.role === 'admin' || user.role === 'owner') && (
          <div className="mt-8">
            {!collapsed && (
              <div className="px-4 mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </h3>
              </div>
            )}
            <ul className="space-y-2">
              {adminMenuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors
                      ${isActive(item.path)
                        ? 'bg-[#1F4280]/10 text-[#1F4280]'
                        : 'text-gray-600 hover:bg-[#1F4280]/5 hover:text-[#1F4280]'
                      }`}
                  >
                    <span className="flex items-center justify-center w-5 h-5 mr-3">
                      {item.icon}
                    </span>
                    {!collapsed && <span className="font-medium">{item.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
        {!collapsed && (
          <div className="text-sm">
            <div className="text-gray-600 font-medium">System Status</div>
            <div className="flex items-center mt-2">
              <span className="h-2.5 w-2.5 rounded-full mr-2 bg-[#1F4280]"></span>
              <span className="text-gray-600">
                Azure Connected
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 