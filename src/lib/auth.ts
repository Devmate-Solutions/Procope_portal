// AWS API Gateway base URL
const AWS_API_BASE = 'https://u7zoq3e0ek.execute-api.us-east-1.amazonaws.com/prod';

// User profile interface based on JWT payload
export interface UserProfile {
  email: string;
  displayName: string;
  workspaceId: string;
  workspaceName: string;
  agentIds: string[];
  role: 'owner' | 'admin' | 'subadmin' | 'manager' | 'user';
  allowedPages: string[];
  userId?: string;
  timestamp: number;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

// Page access mapping for template-based access
export const PAGE_ACCESS_TEMPLATES = {
  template1: [ 'dashboard', 'call-history', 'analytics', 'create-calls', 'user-management'],
  template2: [ 'dashboard', 'call-history', 'analytics', 'create-calls', 'user-management'],
  basic: ['dashboard', 'call-history',  'create-calls','analytics'],
  scribe: ['scribe', 'scribe-history'],
  claims: [  'claims-archive','claims-submit'],
  usermanage: ['user-management'],
  hotel: ['analytics', 'clients', 'hotels'],
  flower: ['dashboard', 'orders']
};
// export const PAGE_ACCESS_TEMPLATES = {
//   template1: ['basic', 'dashboard', 'call-history', 'analytics', 'create-calls', 'user-management'],
//   basic: ['dashboard', 'call-history'],
//   scribe: ['dashboard', 'call-history', 'scribe', 'scribe-history'],
//   claims: ['dashboard', 'call-history', 'claims-archive'],
//   usermanage: ['dashboard', 'call-history', 'user-management', 'add-user']
// };

// Check if user has access to a specific page
export function hasPageAccess(user: UserProfile | null, page: string): boolean {
  if (!user || !user.allowedPages) return false;

  // Special case: if workspace is "Atlanta Flower Shop", allow orders access
  if (page === 'orders' && user.workspaceName === 'Atlanta Flower Shop') {
    return true;
  }

  // Check direct page access
  if (user.allowedPages.includes(page)) return true;

  // Check template-based access
  for (const allowedPage of user.allowedPages) {
    const template = PAGE_ACCESS_TEMPLATES[allowedPage as keyof typeof PAGE_ACCESS_TEMPLATES];
    if (template && template.includes(page)) {
      return true;
    }
  }

  return false;
}

// Get all accessible pages for a user//
export function getAccessiblePages(user: UserProfile | null): string[] {
  if (!user || !user.allowedPages) return [];

  const accessiblePages = new Set<string>();

  // Special case: if workspace is "Atlanta Flower Shop", add orders
  if (user.workspaceName === 'Atlanta Flower Shop') {
    accessiblePages.add('orders');
  }

  for (const allowedPage of user.allowedPages) {
    // Add the page itself
    accessiblePages.add(allowedPage);

    // Add template pages
    const template = PAGE_ACCESS_TEMPLATES[allowedPage as keyof typeof PAGE_ACCESS_TEMPLATES];
    if (template) {
      template.forEach(page => accessiblePages.add(page));
    }
  }

  return Array.from(accessiblePages);
}

// Decode token - handles both JWT and Base64-encoded JSON formats
export function decodeToken(token: string): UserProfile | null {
  try {
    if (!token) {
      console.log("Token is missing");
      return null;
    }

    let payload: any;

    // Check if it's a JWT token (has 3 parts separated by dots)
    if (token.includes('.') && token.split('.').length === 3) {
      // JWT format - decode the payload part
      payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    } else {
      // Base64-encoded JSON format (AWS system)
      try {
        payload = JSON.parse(Buffer.from(token, 'base64').toString());
      } catch (base64Error) {
        // If base64 decoding fails, try parsing as plain JSON
        try {
          payload = JSON.parse(token);
        } catch (jsonError) {
          console.error('Failed to parse token as JSON:', jsonError);
          return null;
        }
      }
    }

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

    console.log('Decoded user payload:', payload);
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

// Login function - calls AWS API Gateway
export async function login(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string; requiresPasswordChange?: boolean }> {
  try {
    console.log('🌐 Making login request to:', `${AWS_API_BASE}/auth/login`);
    const response = await fetch(`${AWS_API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: email, password }),
    });

    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📦 Response data:', data);

    if (response.ok && data.success) {
      if (data.requiresPasswordChange) {
        return { 
          success: false, 
          requiresPasswordChange: true,
          error: data.error || 'Password change required'
        };
      }
      
      if (data.token) {
        console.log('💾 Storing token...');
        storeToken(data.token);
        console.log('✅ Token stored successfully');
        return { success: true, token: data.token };
      }
    }
    
    console.log('❌ Login failed:', data);
    return { 
      success: false, 
      error: data.error || data.message || 'Login failed',
      requiresPasswordChange: data.requiresPasswordChange || false
    };
  } catch (error) {
    console.error('🚨 Login network error:', error);
    return { success: false, error: 'Network error during login' };
  }
}

// Logout function
export async function logout(): Promise<void> {
  try {
    // Always remove token locally (AWS backend doesn't require logout endpoint)
    removeToken();
  } catch (error) {
    console.error('Logout error:', error);
  }
}
