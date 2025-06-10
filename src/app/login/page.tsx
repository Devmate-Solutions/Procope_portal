"use client"

import Image from 'next/image';
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import logo from '../../../public/logov2.png'
import Cookies from 'js-cookie';

// Azure Functions API base URL - update this to your deployed function app URL
const AZURE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_AZURE_FUNCTIONS_URL || 'https://func-retell425.azurewebsites.net/api';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const existingToken = Cookies.get('retell_jwt_token');
        if (existingToken) {
          console.log('🔍 Checking existing authentication...');
          
          // Verify token with dashboard endpoint
          const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/dashboard`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${existingToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            console.log('✅ User already authenticated, redirecting...');
            router.push('/analytics');
            return;
          } else {
            // Token is invalid, remove it
            console.log('🔄 Token expired or invalid, clearing...');
            Cookies.remove('retell_jwt_token');
          }
        }
      } catch (error) {
        console.error('🔴 Error checking authentication:', error);
        Cookies.remove('retell_jwt_token');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, [router]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle authentication errors
  const handleAuthError = (error, statusCode) => {
    console.error('🔴 Authentication Error:', error);

    let errorMessage = 'An unexpected authentication error occurred.';

    if (statusCode) {
      switch (statusCode) {
        case 400:
          errorMessage = 'Please fill in both username and password.';
          break;
        case 401:
          errorMessage = 'Invalid username or password. Please check your credentials and try again.';
          break;
        case 403:
          errorMessage = 'Access denied. You may not be assigned to any workspace or lack permissions.';
          break;
        case 429:
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
          break;
        case 500:
          errorMessage = 'Server error occurred. Please try again later or contact support.';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporarily unavailable. Please try again in a few moments.';
          break;
        default:
          errorMessage = `Authentication failed with status ${statusCode}. Please try again.`;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.message;
      }
    }

    setError(errorMessage);
    setIsLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      console.log('🚀 Starting authentication for:', formData.username);

      // Call your Azure Functions login endpoint
      const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('🔴 Login failed:', responseData);
        handleAuthError(responseData.error || 'Login failed', response.status);
        return;
      }

      if (responseData.success && responseData.token) {
        console.log('✅ Authentication successful for workspace:', responseData.user?.workspaceName);
        
        // Store JWT token in secure cookie
        Cookies.set('retell_jwt_token', responseData.token, {
          path: '/',
          expires: 1, // 1 day
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production'
        });

        // Store user info in session storage
        if (responseData.user) {
          sessionStorage.setItem('user_profile', JSON.stringify(responseData.user));
          console.log('👤 User profile stored:', {
            workspace: responseData.user.workspaceName,
            role: responseData.user.role,
            agentCount: responseData.user.agentIds?.length || 0
          });
        }

        // Clear form
        setFormData({ username: '', password: '' });

        // Redirect to analytics dashboard
        router.push('/analytics');
      } else {
        handleAuthError('Invalid response from authentication server');
      }

    } catch (error) {
      console.error('🔴 Network or parsing error:', error);
      handleAuthError(error);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin(e);
    }
  };

  // Show loading spinner while checking existing authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-none">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1F4280]" />
            <p className="mt-4 text-sm text-gray-600">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="text-center py-8">
          <div className="flex justify-center mb-4">
            <Image 
              src={logo} 
              alt="ORASURG Logo" 
              width={200} 
              height={60} 
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl text-[#1F4280]">
            ORASURG Dashboard
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Multi-Tenant Voice Agent Management
          </p>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="flex items-start space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username / Email
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="email"
                  value={formData.username}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your email address"
                  disabled={isLoading}
                  className="w-full"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your password"
                    disabled={isLoading}
                    className="w-full pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isLoading || !formData.username.trim() || !formData.password.trim()}
              className="w-full bg-[#1F4280] hover:bg-[#1F4280]/90 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>• Workspace-based access control</p>
              <p>• Agent-level permissions</p>
              <p>• Secure JWT authentication</p>
            </div>
          </form>

          <div className="pt-6 border-t border-gray-200 mt-6">
            <div className="text-xs text-gray-400 text-center">
              <p className="mb-1">Backend: Azure Functions + Key Vault</p>
              <p>Security: JWT + Multi-Tenant + Graph API</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}