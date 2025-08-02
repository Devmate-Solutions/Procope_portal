import { getStoredToken, getCurrentUser } from './auth';

// AWS API Gateway base URL
const AWS_API_BASE = 'https://u7zoq3e0ek.execute-api.us-east-1.amazonaws.com/prod';

// Generic API call function with authentication
async function makeAuthenticatedRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const token = getStoredToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${AWS_API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`API Error ${response.status}: ${errorData}`);
  }

  return response.json();
}

// Dashboard data
export async function getDashboardData(): Promise<any> {
  return makeAuthenticatedRequest('/retell/dashboard');
}

// Agent management
export async function getAgents(): Promise<any> {
  return makeAuthenticatedRequest('/retell/agent');
}

export async function getAgent(agentId: string): Promise<any> {
  return makeAuthenticatedRequest(`/retell/agent/${agentId}`);
}

export async function createAgent(agentData: any): Promise<any> {
  return makeAuthenticatedRequest('/retell/agent', 'POST', agentData);
}

export async function updateAgent(agentId: string, agentData: any): Promise<any> {
  return makeAuthenticatedRequest(`/retell/agent/${agentId}`, 'PUT', agentData);
}

export async function deleteAgent(agentId: string): Promise<any> {
  return makeAuthenticatedRequest(`/retell/agent/${agentId}`, 'DELETE');
}

// Phone number management - AWS system uses different endpoint structure
export async function getPhoneNumbers(): Promise<any> {
  // In AWS system, phone numbers are retrieved via retell proxy
  return makeAuthenticatedRequest('/retell/phone-number');
}

export async function getPhoneNumber(phoneId: string): Promise<any> {
  return makeAuthenticatedRequest(`/retell/phone-number/${phoneId}`);
}

export async function createPhoneNumber(phoneData: any): Promise<any> {
  return makeAuthenticatedRequest('/retell/phone-number', 'POST', phoneData);
}

// Call management
export async function getCalls(filters?: any): Promise<any> {
  const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
  return makeAuthenticatedRequest(`/retell/call${queryParams}`);
}

export async function getCall(callId: string): Promise<any> {
  return makeAuthenticatedRequest(`/retell/call/${callId}`);
}

export async function createCall(callData: any): Promise<any> {
  // Format the call data to match AWS backend expectations
  const formattedData = {
    from_number: callData.from_number,
    to_number: callData.to_number,
    agent_id: callData.override_agent_id || callData.agent_id,
    retell_llm_dynamic_variables: callData.retell_llm_dynamic_variables || {},
    metadata: callData.metadata || {}
  };
  return makeAuthenticatedRequest('/retell/call', 'POST', formattedData);
}

export async function createBatchCalls(callsData: any): Promise<any> {
  return makeAuthenticatedRequest('/retell/call/batch', 'POST', callsData);
}

// Analytics
export async function getAnalytics(filters?: any): Promise<any> {
  const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
  return makeAuthenticatedRequest(`/retell/analytics${queryParams}`);
}

// Recordings
export async function getRecordings(filters?: any): Promise<any> {
  const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
  return makeAuthenticatedRequest(`/retell/recordings${queryParams}`);
}

// User Management Functions
export async function listWorkspaceUsers(): Promise<any> {
  return makeAuthenticatedRequest('/users');
}

export async function createUser(userData: any): Promise<any> {
  return makeAuthenticatedRequest('/users', 'POST', userData);
}

export async function updateUser(email: string, updateData: any): Promise<any> {
  const encodedEmail = encodeURIComponent(email);
  return makeAuthenticatedRequest(`/users/${encodedEmail}`, 'PUT', updateData);
}

export async function deleteUser(email: string): Promise<any> {
  const encodedEmail = encodeURIComponent(email);
  return makeAuthenticatedRequest(`/users/${encodedEmail}`, 'DELETE');
}

export async function adminResetPassword(resetData: any): Promise<any> {
  return makeAuthenticatedRequest('/users/admin/reset-password', 'POST', resetData);
}

export async function userResetPassword(resetData: any): Promise<any> {
  const useAuth = !!getStoredToken();
  if (useAuth) {
    return makeAuthenticatedRequest('/users/user/reset-password', 'POST', resetData);
  } else {
    // For non-authenticated password reset
    const response = await fetch(`${AWS_API_BASE}/users/user/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resetData),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error ${response.status}: ${errorData}`);
    }
    
    return response.json();
  }
}

// Page Management Functions
export async function updateUserPages(email: string, pagesData: any): Promise<any> {
  const encodedEmail = encodeURIComponent(email);
  return makeAuthenticatedRequest(`/users/${encodedEmail}/pages`, 'PUT', pagesData);
}

// Helper function to get user's accessible agent IDs
export function getUserAgentIds(): string[] {
  const user = getCurrentUser();
  return user?.agentIds || [];
}

// Helper function to check if user has admin role
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin' || user?.role === 'owner';
}

// Helper function to check if user has workspace admin role
export function isWorkspaceAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin' || user?.role === 'owner';
}

// Helper function to get current workspace info
export function getCurrentWorkspace(): { id: string; name: string } | null {
  const user = getCurrentUser();
  if (!user) return null;
  
  return {
    id: user.workspaceId,
    name: user.workspaceName
  };
}

// Helper function to check page access
export function hasPageAccess(pageName: string): boolean {
  const user = getCurrentUser();
  if (!user || !user.allowedPages) {
    return false;
  }
  return user.allowedPages.includes(pageName);
}

// Available pages configuration
export const AVAILABLE_PAGES = {
  'basic': {
    name: 'Basic Dashboard',
    icon: '📊',
    description: 'Core dashboard and calling features'
  },
  'scribe': {
    name: 'Scribe',
    icon: '🎤',
    description: 'AI transcription and documentation'
  },
  'claims': {
    name: 'Claims',
    icon: '📄',
    description: 'Insurance claims processing'
  },
  'usermanage': {
    name: 'User Management',
    icon: '👥',
    description: 'User administration and access control'
  }
};
