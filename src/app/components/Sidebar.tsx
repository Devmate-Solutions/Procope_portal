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
  FaUserPlus,
  FaMicrophoneAlt
} from 'react-icons/fa';
import { getCurrentUser } from '@/lib/auth';


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

  // Voice Assistant section links
  const voiceMenuItems: SidebarItem[] = [
    { name: 'Dashboard', path: '/', icon: <FaChartLine className="w-5 h-5" /> },
    { name: 'Create Calls', path: '/create-calls', icon: <FaPhoneAlt className="w-5 h-5" /> },
    { name: 'Call History', path: '/call-history', icon: <FaHistory className="w-5 h-5" /> },
    { name: 'Call Analytics', path: '/analytics', icon: <FaChartLine className="w-5 h-5" /> },
  ];
const claimsMenuItems: SidebarItem[] = [
  { name: 'Submit Claim', path: '/pdf-extractor', icon: <FaChartLine className="w-5 h-5" /> },
  { name: 'Claims Archive', path: '/claims-archive', icon: <FaChartLine className="w-5 h-5" /> },
];
const templateMenuItems: SidebarItem[] = [
  
  { name: 'Template 1', path: '/template-1', icon: <FaChartLine className="w-5 h-5" /> },
];

  const menuItems: SidebarItem[] = [
    
    { name: 'Record Session', path: '/scribe', icon: <FaChartLine className="w-5 h-5" /> },
    { name: 'Scribe History', path: '/scribe-history', icon: <FaChartLine className="w-5 h-5" /> },
  
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
          <h1 className="text-[#1F4280] font-bold text-2xl">MyDent.AI</h1>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          {collapsed ? <FaBars className="w-5 h-5" /> : <FaTimes className="w-5 h-5" />}
        </button>
      </div>

      {/* Voice Assistant Section */}
      <nav className="mt-6 px-2">
        {!collapsed && (
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Voice Assistant
            </h3>
          </div>
        )}
        <ul className="space-y-2 mb-4">
          {voiceMenuItems.map((item) => (
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
      </nav>

      {/* Main Menu Items */}
      <nav className="mt-2 px-2">
      {!collapsed && (
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Scribe
            </h3>
          </div>
        )}
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
      </nav>
     

      {/* Claims Section */}
      <nav className="mt-2 px-2">
        {!collapsed && (
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
             Claims
            </h3>
          </div>
        )}
        <ul className="space-y-2">
          {claimsMenuItems.map((item) => (
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
        </nav>



      {/* Template Section */}
      <nav className="mt-2 px-2"> 
        {!collapsed && (
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Templates
            </h3>
          </div>
        )}
        <ul className="space-y-2"> 
          {templateMenuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path} className={`flex items-center px-4 py-3 rounded-lg transition-colors  
                  ${isActive(item.path)
                    ? 'bg-[#1F4280]/10 text-[#1F4280]'
                    : 'text-gray-600 hover:bg-[#1F4280]/5 hover:text-[#1F4280]'
                  }`}>
                <span className="flex items-center justify-center w-5 h-5 mr-3">{item.icon}</span>
                {!collapsed && <span className="font-medium">{item.name}</span>}
              </Link>
            </li>
          ))}
           </ul>
      </nav>
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

      
    </div>
  );
} 