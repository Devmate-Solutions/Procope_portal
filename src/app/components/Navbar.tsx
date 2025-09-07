"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Building } from 'lucide-react'
import { getCurrentUser, logout, type UserProfile } from '@/lib/auth'
import Image from 'next/image'
import logo from '../../../public/Procope.png'
export function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const router = useRouter()

  useEffect(() => {
    setUser(getCurrentUser())
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if logout fails
      router.push('/login')
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-4 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
         
          {user && (
           
            <div className="flex items-center space-x-2">
              <Image src={logo} alt="Logo" width={70} height={70} className="rounded-full" />
            </div>
          )}
        
        </div>
        
        <div className="flex items-center space-x-4">
          {user && (
             
              // add styling to workspaceId
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
               
                <span className="text-sm text-black-500 font-medium px-2 py-1 bg-white-100 rounded">{user.workspaceId}</span>
                <User className="h-4 w-4 text-gray-500" />
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {user.displayName}
                  </div>
                  <div className="text-gray-500 capitalize">
                    {user.role}
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
