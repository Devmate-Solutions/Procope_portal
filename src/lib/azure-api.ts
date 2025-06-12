import { getStoredToken, getCurrentUser } from './auth';

// Azure Functions API base URL
const AZURE_API_BASE = 'https://func-retell425.azurewebsites.net/api';

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

  const response = await fetch(`${AZURE_API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`API Error ${response.status}: ${errorData}`);
  }

  return response.json();
}

// Dashboard data
export async function getDashboardData(): Promise<any> {
  return makeAuthenticatedRequest('/dashboard');
}

// Agent management - now returns phone numbers with agent information
export async function getAgents(): Promise<any> {
  return makeAuthenticatedRequest('/retell/phone-number');
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

// Phone number management
export async function getPhoneNumbers(): Promise<any> {
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
  // Format the call data to match backend expectations
  const formattedData = {
    from_number: callData.from_number,
    to_number: callData.to_number,
    agent_id: callData.override_agent_id || callData.agent_id,
    override_agent_version: callData.override_agent_version || 1,
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

// Helper function to get user's accessible agent IDs
export function getUserAgentIds(): string[] {
  const user = getCurrentUser();
  return user?.agentIds || [];
}

// Helper function to check if user has admin role
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

// Helper function to check if user has workspace admin role
export function isWorkspaceAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
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
