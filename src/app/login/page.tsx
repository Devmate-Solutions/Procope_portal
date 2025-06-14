"use client"

import Image from 'next/image';
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff } from 'lucide-react'
import logo from '../../../public/logov2.png'
import { login, getStoredToken, getCurrentUser } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false)
  const router = useRouter()

  // Check if user is already logged in
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const user = getCurrentUser();
      if (user) {
        console.log('✅ User already logged in, redirecting to dashboard');
        router.push('/dashboard');
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setPasswordChangeRequired(false);

      console.log('🔄 Attempting login with:', { email, password: '***' });
      const result = await login(email, password);
      console.log('📥 Login result:', result);

      if (result.success) {
        console.log('✅ Login successful, redirecting to dashboard');
        // Add a small delay to ensure token is stored
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } else {
        // Check for password change required message
        if (result.error && result.error.toLowerCase().includes('password change required')) {
          setPasswordChangeRequired(true);
          setError('Password change required. Please set a new password.');
        } else {
          console.log('❌ Login failed:', result.error);
          setError(result.error || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="text-center text-white py-8 rounded-t-lg">
          <div className="flex justify-center mb-4">
           <h1 className=' text-[#1F4280] font-bold text-2xl'>MyDent.AI</h1>
          </div>
          <CardTitle className="text-2xl text-[#1F4280]">
            Dashboard Login
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
                {error}
                {passwordChangeRequired && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-blue-600 underline text-sm"
                      onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
                    >
                      Set a new password
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              User name
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="provided username"
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={isLoading}
              className="w-full bg-[#1F4280] hover:bg-[#1F4280]/90 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}