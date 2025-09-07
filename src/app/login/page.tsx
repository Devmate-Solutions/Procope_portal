"use client"
//
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { login, getCurrentUser } from '@/lib/auth'
import { resetUserPassword } from '@/lib/aws-api'
import Image from 'next/image'
import logo from '../../../public/Procope.png' // Adjust the path as necessary
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
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-10 flex flex-col items-center justify-center">
          <div className="flex justify-center mb-4">
            <Image src={logo} alt="logo" width={80} height={80} priority />
          </div>
          <h1 className="text-3xl font-extrabold text-black">Procope</h1>
          <p className="text-gray-600 mt-2">
            {requiresPasswordChange ? 'Reset your password' : 'Sign in to your dashboard'}
          </p>
        </div>

        {/* Login/Password Reset Card */}
        <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200">
          {error && (
            <Alert className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!requiresPasswordChange ? (
            /* Login Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                  Email Address
                </Label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-black mb-1">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-black">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          ) : (
            /* Password Reset Form */
            <form onSubmit={handlePasswordReset} className="space-y-5">
              {/* Workspace ID Field */}
              <div>
                <Label htmlFor="workspaceId" className="block text-sm font-medium text-black mb-1">
                  Workspace ID
                </Label>
                <Input
                  type="text"
                  id="workspaceId"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your workspace ID"
                  required
                />
              </div>

              {/* New Password Field */}
              <div>
                <Label htmlFor="newPassword" className="block text-sm font-medium text-black mb-1">
                  New Password
                </Label>
                <Input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your new password"
                  required
                />
              </div>

              {/* Reset Password Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </Button>

              {/* Back to Login Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRequiresPasswordChange(false);
                  setError('');
                  setWorkspaceId('');
                  setNewPassword('');
                }}
                className="w-full mt-3"
              >
                Back to Login
              </Button>
            </form>
          )}

          {/* Demo Credentials
          {!requiresPasswordChange && (
            <div className="mt-6 p-5 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-700 text-sm font-semibold mb-2">Demo Credentials</p>
              <p className="text-sm text-gray-600">Email: <span className="text-blue-600 font-mono">any@email.com</span></p>
              <p className="text-sm text-gray-600">Password: <span className="text-blue-600 font-mono">any password</span></p>
            </div>
          )} */}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600 text-xs">
            © 2025 procope.ai
          </p>
        </div>
      </div>
    </div>
  );
}

