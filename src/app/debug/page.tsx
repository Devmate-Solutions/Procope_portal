'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, getStoredToken, login, logout } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('habibhussainsolangi783@hellothreadsandbeams.onmicrosoft.com');
  const [password, setPassword] = useState('');
  const [loginResult, setLoginResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = () => {
    const currentUser = getCurrentUser();
    const currentToken = getStoredToken();
    setUser(currentUser);
    setToken(currentToken);
    console.log('🔄 Debug refresh:', { currentUser, currentToken });
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      setLoginResult(result);
      refreshData();
    } catch (error) {
      console.error('Login error:', error);
      setLoginResult({ success: false, error: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLoginResult(null);
    refreshData();
  };

  const checkCookies = () => {
    if (typeof window === 'undefined') {
      alert('Cannot check cookies during server-side rendering');
      return;
    }

    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    console.log('🍪 All cookies:', cookies);
    alert(`Cookies: ${JSON.stringify(cookies, null, 2)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">🐛 Authentication Debug Page</h1>
        
        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Login Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password:</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleLogin} disabled={isLoading} variant="default" size="default" className="">
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
              <Button onClick={handleLogout} variant="outline" size="default" className="">
                Logout
              </Button>
              <Button onClick={refreshData} variant="outline" size="default" className="">
                Refresh Data
              </Button>
              <Button onClick={checkCookies} variant="outline" size="default" className="">
                Check Cookies
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Login Result */}
        {loginResult && (
          <Card>
            <CardHeader>
              <CardTitle>Login Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(loginResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Current Token */}
        <Card>
          <CardHeader>
            <CardTitle>Current Token</CardTitle>
          </CardHeader>
          <CardContent>
            {token ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">Token found in localStorage:</p>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto break-all">
                  {token}
                </pre>
              </div>
            ) : (
              <p className="text-red-600">No token found in localStorage</p>
            )}
          </CardContent>
        </Card>

        {/* Current User */}
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            ) : (
              <p className="text-red-600">No user data available</p>
            )}
          </CardContent>
        </Card>

        {/* Browser Info */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'Server-side rendering'}</p>
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side rendering'}</p>
              <p><strong>Local Storage Available:</strong> {typeof window !== 'undefined' && typeof Storage !== 'undefined' ? '✅ Yes' : '❌ No'}</p>
              <p><strong>Cookies Enabled:</strong> {typeof window !== 'undefined' ? (navigator.cookieEnabled ? '✅ Yes' : '❌ No') : 'Unknown'}</p>
            </div>
          </CardContent>
        </Card>

        {/* API Test */}
        <Card>
          <CardHeader>
            <CardTitle>API Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  fetch('https://func-retell425.azurewebsites.net/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: email, password })
                  })
                  .then(res => res.json())
                  .then(data => {
                    console.log('Direct API test result:', data);
                    alert(`API Response: ${JSON.stringify(data, null, 2)}`);
                  })
                  .catch(err => {
                    console.error('Direct API test error:', err);
                    alert(`API Error: ${err.message}`);
                  });
                }}
                variant="outline"
                size="default"
                className=""
              >
                Test Direct API Call
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
