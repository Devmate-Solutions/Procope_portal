"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Phone,
  PhoneCall,
  Users,
  FileText,
  Archive,
  Mic,
  History,
  UserPlus,
  LayoutDashboard,
  Building,
  ShoppingBag
} from 'lucide-react'
import { getCurrentUser, hasPageAccess } from '@/lib/auth'
import { useEffect, useState } from 'react'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [user, setUser] = useState(getCurrentUser())

  useEffect(() => {
    const currentUser = getCurrentUser()
    console.log('Sidebar - Current user:', currentUser)
    console.log('Sidebar - User allowedPages:', currentUser?.allowedPages)
    setUser(currentUser)
  }, [])

  // Define navigation items with their required page access
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      requiredPage: 'dashboard'
    },
    {
      name: 'Call History',
      href: '/call-history',
      icon: History,
      requiredPage: 'call-history'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      requiredPage: 'analytics'
    },
    {
      name: 'Clients',
      href: '/clients',
      icon: Users,
      requiredPage: 'clients'
    },
    {
      name: 'Hotels',
      href: '/hotels',
      icon: Building,
      requiredPage: 'hotels'
    },
    {
      name: 'Create Calls',
      href: '/create-calls',
      icon: PhoneCall,
      requiredPage: 'create-calls'
    },
    {
      name: 'Scribe',
      href: '/scribe',
      icon: Mic,
      requiredPage: 'scribe'
    },
    {
      name: 'Scribe History',
      href: '/scribe-history',
      icon: FileText,
      requiredPage: 'scribe-history'
    },
    {
      name: 'Submit Claims',
      href: '/pdf-extractor',
      icon: Archive,
      requiredPage: 'claims-submit'
    },
    {
      name: 'Claims Archive',
      href: '/claims-archive',
      icon: Archive,
      requiredPage: 'claims-archive'
    },
    {
      name: 'User Management',
      href: '/user-management',
      icon: Users,
      requiredPage: 'user-management'
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingBag,
      requiredPage: 'orders'
    },
    {
      name: 'Add User',
      href: '/add-user',
      icon: UserPlus,
      requiredPage: 'add-user'
    }
  ]

  // Check if user has "hotel" in allowedPages - if so, only show hotel-related pages
  const hasHotelAccess = user?.allowedPages?.includes('hotel')
  console.log('Sidebar - Has hotel access:', hasHotelAccess)

  let accessibleItems
  if (hasHotelAccess) {
    // If user has "hotel" access, only show analytics, clients, and hotels
    const hotelPages = ['analytics', 'clients', 'hotels']
    accessibleItems = navigationItems.filter(item =>
      hotelPages.includes(item.requiredPage) && hasPageAccess(user, item.requiredPage)
    )
    console.log('Sidebar - Hotel user accessible items:', accessibleItems.map(item => item.name))
  } else {
    // Otherwise, show all pages they have access to
    accessibleItems = navigationItems.filter(item =>
      hasPageAccess(user, item.requiredPage)
    )
    console.log('Sidebar - Regular user accessible items:', accessibleItems.map(item => item.name))
  }

  return (
    <div className={cn("w-64 overflow-y-auto", className)}>
      <div className="p-8 pt-12">
        <div className="space-y-2">
          {accessibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn(
                  "mr-3 h-5 w-5 transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                )} />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
