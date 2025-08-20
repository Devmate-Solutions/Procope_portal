"use client"
//
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { login, getCurrentUser } from '@/lib/auth'
import { resetUserPassword } from '@/lib/aws-api'
import Image from 'next/image'
import logo from '../../../public/mydent.png' // Adjust the path as necessary
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('') // for password reset

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false)
  const [workspaceId, setWorkspaceId] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const user = getCurrentUser()
    if (user) {
      router.push('/dashboard')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('🔐 Attempting login for:', email)
      const result = await login(email, password)
      
      if (result.success) {
        console.log('✅ Login successful, redirecting to dashboard')
        router.push('/dashboard')
      } else if (result.requiresPasswordChange) {
        setRequiresPasswordChange(true)
        setError('Password change required. Please contact your administrator to get Workspace ID.')
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) {
      setError('Please enter a new password')
      return
    }

    setIsLoading(true)
    setError('')

    // try {
    //   const result1 = await resetUserPassword(email, newPassword,workspaceId ) // replace with real workspaceId
    //   // After successful reset, try logging in again with new password
    //   const result = await login(email, newPassword)
    //   if (result.success) {
    //     router.push('/dashboard')
    //   } else {
    //     setError(result.error || 'Login failed after password reset')
    //   }
    // } catch (err) {
    //   console.error('Password reset error:', err)
    //   setError(result1.error || 'Failed to reset password. Please try again.')
    // } finally {
    //   setIsLoading(false)
    // }
    try {
  const result1 = await resetUserPassword(email, newPassword, workspaceId); // replace with real workspaceId

  // After successful reset, try logging in again with new password
  const result = await login(email, newPassword);

  if (result.success) {
    router.push('/dashboard');
  } else {
    setError(result.error || 'Login failed after password reset');
  }
} catch (err: any) {
  console.error('Password reset error:', err);
  setError(err?.message || 'Failed to reset password. Please try again.');
} finally {
  setIsLoading(false);
}

  }


   return (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Sign In
        </CardTitle>
        <div className="flex justify-center mb-4">
          <Image src={logo} alt="MyDent Logo" width={80} height={80} className="object-contain" />
        </div>
        <p className="text-gray-600">
          Mydent AI dashboard
        </p>
      </CardHeader>
      <CardContent>
        {requiresPasswordChange ? (
          // Password reset form
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <Label htmlFor="workspaceId">Workspace ID</Label>
              <Input
                id="workspaceId"
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder="Enter your workspace ID"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <div className="text-red-600 text-sm">{error}</div>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        ) : (
          // Regular login form
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <div className="text-red-600 text-sm">{error}</div>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  </div>
)

}
