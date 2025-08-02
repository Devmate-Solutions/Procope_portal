// AWS API Gateway base URL
const AWS_API_BASE = 'https://u7zoq3e0ek.execute-api.us-east-1.amazonaws.com/prod';

// Get stored token from localStorage
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// Make authenticated API call to AWS backend
async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  try {
    console.log(`Making request to: ${AWS_API_BASE}${endpoint}`);
    
    const response = await fetch(`${AWS_API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        const errorText = await response.text().catch(() => '');
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data;
    
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
}

// Get calls with filters
export async function getCalls(filters: any = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters as query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/retell/call${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const data = await makeAuthenticatedRequest(endpoint);
    
    // Handle different response formats from backend
    if (data.calls && Array.isArray(data.calls)) {
      return data.calls;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch calls:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
}

// Get analytics data
export async function getAnalytics(filters: any = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters as query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/retell/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await makeAuthenticatedRequest(endpoint);
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    // Return default analytics structure
    return {
      callCount: 0,
      callDuration: { totalDuration: 0, formattedDuration: '0m 0s' },
      callLatency: 0,
      callSuccessData: { successful: 0, unsuccessful: 0, unknown: 0 },
      disconnectionData: {},
      directionData: { inbound: 0, outbound: 0, unknown: 0 },
      callAnalytics: { sentiments: {}, voicemails: 0, totalCost: 0, averageTokens: 0 }
    };
  }
}

// Create a single call
export async function createCall(callData: {
  from_number: string;
  to_number: string;
  agent_id: string;
  retell_llm_dynamic_variables?: any;
  metadata?: any;
}) {
  try {
    return await makeAuthenticatedRequest('/retell/call', {
      method: 'POST',
      body: JSON.stringify(callData),
    });
  } catch (error) {
    console.error('Failed to create call:', error);
    throw error;
  }
}

// Create batch calls
export async function createBatchCalls(calls: any[]) {
  try {
    return await makeAuthenticatedRequest('/retell/call/batch', {
      method: 'POST',
      body: JSON.stringify({ calls }),
    });
  } catch (error) {
    console.error('Failed to create batch calls:', error);
    throw error;
  }
}

// Get agents
export async function getAgents() {
  try {
    const data = await makeAuthenticatedRequest('/retell/agent');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return [];
  }
}

// Get dashboard data
export async function getDashboardData() {
  try {
    return await makeAuthenticatedRequest('/retell/dashboard');
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return {
      user: null,
      agents: [],
      permissions: {},
      stats: { totalAgents: 0, accessibleAgents: 0, workspaceRole: 'user' }
    };
  }
}

// Get recordings
export async function getRecordings(filters: any = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/retell/recordings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const data = await makeAuthenticatedRequest(endpoint);
    
    return data.recordings || [];
  } catch (error) {
    console.error('Failed to fetch recordings:', error);
    return [];
  }
}

// User management functions
export async function getUsers() {
  try {
    return await makeAuthenticatedRequest('/users');
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
}

export async function createUser(userData: {
  user_email: string;
  display_name: string;
  role: string;
  agent_ids: string[];
  allowed_pages: string[];
  password?: string;
}) {
  try {
    return await makeAuthenticatedRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

export async function updateUser(email: string, userData: any) {
  try {
    return await makeAuthenticatedRequest(`/users/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}

export async function deleteUser(email: string) {
  try {
    return await makeAuthenticatedRequest(`/users/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
}

export async function resetUserPassword(email: string, newPassword: string, isAdmin: boolean = false) {
  try {
    const endpoint = isAdmin ? '/users/admin/reset-password' : '/users/user/reset-password';
    return await makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ 
        user_email: email, 
        new_password: newPassword 
      }),
    });
  } catch (error) {
    console.error('Failed to reset password:', error);
    throw error;
  }
}
