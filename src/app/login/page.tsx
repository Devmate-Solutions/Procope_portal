"use client"

import Image from 'next/image';
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import logo from '../../../public/logov2.png'
import { msalInstance, loginRequest, initializeMsal } from '@/lib/azure-auth-config'
import { 
  InteractionStatus, 
  InteractionRequiredAuthError,
  AuthError,
  RedirectRequest
} from '@azure/msal-browser'
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()

  // Comprehensive error handling function
  const handleAuthError = (error: unknown) => {
    console.error('🔴 Authentication Error:', error);

    let errorMessage = 'An unexpected authentication error occurred.';

    if (error instanceof InteractionRequiredAuthError) {
      errorMessage = 'Interactive authentication is required. Please try again.';
    } else if (error instanceof AuthError) {
      switch (error.errorCode) {
        case 'user_cancelled':
          errorMessage = 'Login was cancelled by the user.';
          break;
        case 'access_denied':
          errorMessage = 'Access denied. Please check your credentials.';
          break;
        case 'invalid_request':
          errorMessage = 'Invalid authentication request. Please contact support.';
          break;
        default:
          errorMessage = `Authentication failed: ${error.errorMessage || error.errorCode}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    setError(errorMessage);
    setIsLoading(false);
  };

  // Initialize MSAL on component mount
  useEffect(() => {
    const initMsal = async () => {
      try {
        console.log('🚀 Initializing authentication...');
        await initializeMsal();
        setIsInitialized(true);

        // Handle redirect from Azure AD
        try {
          const authResult = await msalInstance.handleRedirectPromise();
          if (authResult) {
            // Set auth_token cookie for middleware
            if (authResult.idToken) {
              // Add the token to a cookie for the middleware
              Cookies.set('auth_token', authResult.idToken, { 
                path: '/', 
                expires: 1,
                sameSite: 'strict'
              });
              console.log('🔑 Auth token cookie set successfully');
            } else {
              console.error('⚠️ No ID token found in auth result');
            }
            console.log('✅ Authentication successful');
            router.push('/analytics');
          }
        } catch (redirectError) {
          handleAuthError(redirectError);
        }
      } catch (initError) {
        handleAuthError(initError);
      }
    };

    initMsal();
  }, [router]);

  const handleLogin = async () => {
    // Ensure MSAL is initialized before login attempt
    if (!isInitialized) {
      setError('Authentication system is not ready. Please try again.');
      return;
    }

    try {
      setIsLoading(true)
      setError('')

      // Create a properly typed RedirectRequest
      const redirectRequest: RedirectRequest = {
        ...loginRequest,
        redirectStartPage: window.location.href
      };

      // Use loginRedirect for SPA authentication
      await msalInstance.loginRedirect(redirectRequest)
    } catch (error) {
      handleAuthError(error);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="text-center text-white py-8 rounded-t-lg">
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
            ORASURG Dashboard Login
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-md">
                {error}
              </div>
            )}
            
            <Button 
              type="button"
              variant="default"
              size="default"
              onClick={handleLogin}
              disabled={isLoading || !isInitialized}
              className="w-full bg-[#1F4280] hover:bg-[#1F4280]/90 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Login with Azure AD'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 