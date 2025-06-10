// Azure Functions API base URL
const AZURE_API_BASE = 'https://func-retell425.azurewebsites.net/api';

// User profile interface based on JWT payload
export interface UserProfile {
  email: string;
  displayName: string;
  workspaceId: string;
  workspaceName: string;
  agentIds: string[];
  role: 'owner' | 'admin' | 'subadmin';
  timestamp: number;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

// Decode JWT token without verification (frontend only)
export function decodeToken(token: string): UserProfile | null {
  try {
    if (!token || token.split('.').length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      console.error('Token is expired');
      return null;
    }

    // Validate required fields
    if (!payload.email || !payload.workspaceId || !payload.role) {
      console.error('Token is missing required fields');
      return null;
    }

    return payload as UserProfile;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

// Verify token by checking expiration and structure
export async function verifyToken(token: string): Promise<boolean> {
  const decoded = decodeToken(token);
  return decoded !== null;
}

// Get stored token from localStorage
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// Store token in localStorage and cookie
export function storeToken(token: string): void {
  if (typeof window === 'undefined') {
    console.log('⚠️ Cannot store token: window is undefined');
    return;
  }
  console.log('💾 Storing token in localStorage and cookie...');
  localStorage.setItem('auth_token', token);

  // Also set as cookie for middleware access
  document.cookie = `auth_token=${token}; path=/; max-age=${24 * 60 * 60}; SameSite=Strict`;
  console.log('✅ Token stored successfully');
}

// Remove token from localStorage and cookie
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  // Remove cookie
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// Get current user profile from stored token
export function getCurrentUser(): UserProfile | null {
  const token = getStoredToken();
  if (!token) {
    console.log('🔍 No token found in localStorage');
    return null;
  }
  console.log('🔍 Token found, decoding...');
  const user = decodeToken(token);
  console.log('👤 Current user:', user);
  return user;
}

// Login function - calls Azure Function
export async function login(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    console.log('🌐 Making login request to:', `${AZURE_API_BASE}/auth/login`);
    const response = await fetch(`${AZURE_API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: email, password }),
    });

    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📦 Response data:', data);

    if (response.ok && data.token) {
      console.log('💾 Storing token...');
      storeToken(data.token);
      console.log('✅ Token stored successfully');
      return { success: true, token: data.token };
    } else {
      console.log('❌ Login failed:', data);
      return { success: false, error: data.error || data.message || 'Login failed' };
    }
  } catch (error) {
    console.error('🚨 Login network error:', error);
    return { success: false, error: 'Network error during login' };
  }
}

// Logout function
export async function logout(): Promise<void> {
  try {
    const token = getStoredToken();
    // if (token) {
    //   // Call logout endpoint
    //   await fetch(`${AZURE_API_BASE}/logout`, {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${token}`,
    //       'Content-Type': 'application/json',
    //     },
    //   });
    // }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always remove token locally
    removeToken();
  }
}