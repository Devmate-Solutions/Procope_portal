"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getCurrentUser, hasPageAccess, type UserProfile } from '@/lib/auth'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  requiredPage?: string
}

export function AuthenticatedLayout({ children, requiredPage }: AuthenticatedLayoutProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const currentUser = getCurrentUser()
    
    if (!currentUser) {
      console.log('❌ No user found, redirecting to login')
      router.push('/login')
      return
    }

    // Check page access if required
    if (requiredPage && !hasPageAccess(currentUser, requiredPage)) {
      console.log(`❌ User doesn't have access to page: ${requiredPage}`)
      router.push('/dashboard') // Redirect to dashboard if no access
      return
    }

    setUser(currentUser)
    setIsLoading(false)
  }, [router, requiredPage, pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex pt-16">
        <Sidebar className="fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r shadow-sm" />
        <main className="flex-1 ml-64 pt-6 px-6 pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
