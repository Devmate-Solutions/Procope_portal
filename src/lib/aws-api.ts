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
    const error = new Error('No authentication token found. Please log in.');
    console.warn(`Auth Error for ${endpoint}:`, error.message);
    throw error;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  try {
    console.log(`Making request to: ${AWS_API_BASE}${endpoint}`);
    console.log(`Using token: ${token.substring(0, 20)}...`);
    
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
      
      // Special handling for 502 errors
      if (response.status === 502) {
        errorMessage = 'Backend service temporarily unavailable (502 Bad Gateway). Please try again in a moment.';
      }
      
      console.warn(`API Warning for ${endpoint}:`, errorMessage);
      const error = new Error(errorMessage);
      error.name = 'APIError';
      throw error;
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data;
    
  } catch (error) {
    // Only log as error if it's not an expected API error
    if (error instanceof Error && error.name === 'APIError') {
      // Already logged as warning above
    } else {
      console.error(`Network Error for ${endpoint}:`, error);
    }
    throw error;
  }
}
async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  
  // if (!token) {
  //   const error = new Error('No authentication token found. Please log in.');
  //   console.warn(`Auth Error for ${endpoint}:`, error.message);
  //   throw error;
  // }

  const headers = {
    'Content-Type': 'application/json',
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
      
      // Special handling for 502 errors
      if (response.status === 502) {
        errorMessage = 'Backend service temporarily unavailable (502 Bad Gateway). Please try again in a moment.';
      }
      
      console.warn(`API Warning for ${endpoint}:`, errorMessage);
      const error = new Error(errorMessage);
      error.name = 'APIError';
      throw error;
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data;
    
  } catch (error) {
    // Only log as error if it's not an expected API error
    if (error instanceof Error && error.name === 'APIError') {
      // Already logged as warning above
    } else {
      console.error(`Network Error for ${endpoint}:`, error);
    }
    throw error;
  }
}

// Get calls with filters
export async function getCalls(filters: any = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    // Set default limit to 50 to prevent timeouts
    const defaultFilters = {
      limit: 50,
      ...filters
    };
    
    // Add filters as query parameters
    Object.entries(defaultFilters).forEach(([key, value]) => {
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
    
    // Process filters and convert timestamps properly
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Convert millisecond timestamps to Unix timestamps (seconds) for the API
        if (key === 'start_timestamp_after' || key === 'start_timestamp_before') {
          // If the value is a string that looks like milliseconds, convert to seconds
          const timestamp = typeof value === 'string' ? parseInt(value) : Number(value);
          if (!isNaN(timestamp) && timestamp > 1000000000000) { // If it's in milliseconds (13+ digits)
            queryParams.append(key, Math.floor(timestamp / 1000).toString());
          } else {
            queryParams.append(key, String(timestamp));
          }
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    const endpoint = `/retell/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log(`Analytics API call: ${AWS_API_BASE}${endpoint}`);
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

// Get resource data (agents and phone numbers) for current user
export async function getResourceData() {
  try {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Decode token to get user info
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const userEmail = decoded.email;
    const workspaceId = decoded.workspaceId;

    console.log('🔄 Fetching resource data for:', { userEmail, workspaceId });

    const data = await makeAuthenticatedRequest('/getresource', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: workspaceId,
        userEmail: userEmail
      }),
    });

    console.log('📦 Resource data response:', data);
    return data;
  } catch (error) {
    console.error('Failed to fetch resource data:', error);
    return { success: false, data: [] };
  }
}

// Get agents (updated to use new resource API)
export async function getAgents() {
  try {
    const resourceData = await getResourceData();
    
    if (!resourceData.success || !resourceData.data || !Array.isArray(resourceData.data)) {
      console.warn('No resource data available');
      return [];
    }

    const agents = [];
    
    // Process each user's agents
    for (const userData of resourceData.data) {
      if (userData.agents) {
        const { inbound, outbound, phoneNumber } = userData.agents;
        
        // Add inbound agent if available
        if (inbound) {
          agents.push({
            agent_id: inbound,
            agent_name: `Inbound Agent - ${phoneNumber || 'No Phone'}`,
            type: 'inbound',
            phoneNumber: phoneNumber,
            userEmail: userData.userEmail,
            workspaceId: userData.workspaceId
          });
        }
        
        // Add outbound agent if available
        if (outbound) {
          agents.push({
            agent_id: outbound,
            agent_name: `Outbound Agent - ${phoneNumber || 'No Phone'}`,
            type: 'outbound',
            phoneNumber: phoneNumber,
            userEmail: userData.userEmail,
            workspaceId: userData.workspaceId
          });
        }
      }
    }

    console.log('🤖 Processed agents:', agents);
    return agents;
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return [];
  }
}

// Get phone numbers for current user
export async function getPhoneNumbers() {
  try {
    const resourceData = await getResourceData();
    
    if (!resourceData.success || !resourceData.data || !Array.isArray(resourceData.data)) {
      console.warn('No resource data available');
      return [];
    }

    const phoneNumbers = [];
    
    // Extract phone numbers from resource data
    for (const userData of resourceData.data) {
      if (userData.agents && userData.agents.phoneNumber) {
        phoneNumbers.push({
          phoneNumber: userData.agents.phoneNumber,
          userEmail: userData.userEmail,
          workspaceId: userData.workspaceId,
          hasInbound: !!userData.agents.inbound,
          hasOutbound: !!userData.agents.outbound
        });
      }
    }

    console.log('📞 Available phone numbers:', phoneNumbers);
    return phoneNumbers;
  } catch (error) {
    console.error('Failed to fetch phone numbers:', error);
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
    
    // Set default limit to 50 to prevent timeouts
    const defaultFilters = {
      limit: 50,
      ...filters
    };
    
    Object.entries(defaultFilters).forEach(([key, value]) => {
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
  email: string;
  displayName: string;
  role: string;
  agentIds: string[];
  allowedPages: string[];
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

export async function resetUserPassword(email: string, newPassword: string, workspaceId: string, isAdmin: boolean = false) {
  try {
    const endpoint = isAdmin ? '/users/admin/reset-password' : '/users/user/reset-password';
    // return await makeAuthenticatedRequest(endpoint, {
    //   method: 'POST',
    //   body: JSON.stringify({ 
    //     user_email: email, 
    //     new_password: newPassword,
    //     workspace_id: workspaceId
    //   }),
    // });
     
    if (isAdmin) {
      // Authenticated request for admin
      return await makeAuthenticatedRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          user_email: email,
          new_password: newPassword,
          workspace_id: workspaceId
        }),
      });
    } else {
      // Regular request for non-admin users
      return await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          user_email: email,
          new_password: newPassword,
          workspace_id: workspaceId
        }),
      });
    }
  } catch (error) {
    console.error('Failed to reset password:', error);
    throw error;
  }
}

// Demo function for getNumber() - generates random phone numbers for testing
export function getNumber(type: 'from' | 'to' = 'to', format: 'us' | 'international' = 'us'): string {
  console.log(`Generating demo ${type} number in ${format} format`);
  
  if (format === 'international') {
    // Generate international format numbers
    const countryCodes = ['+1', '+44', '+49', '+33', '+81', '+86', '+91'];
    const countryCode = countryCodes[Math.floor(Math.random() * countryCodes.length)];
    const number = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `${countryCode}${number}`;
  } else {
    // Generate US format numbers
    const areaCodes = ['555', '212', '310', '415', '713', '202', '305', '404'];
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `+1${areaCode}${exchange}${number}`;
  }
}

// Demo function to get multiple numbers for batch operations
export function getNumbers(count: number = 5, type: 'from' | 'to' = 'to', format: 'us' | 'international' = 'us'): string[] {
  console.log(`Generating ${count} demo ${type} numbers in ${format} format`);
  
  const numbers: string[] = [];
  const usedNumbers = new Set<string>();
  
  while (numbers.length < count) {
    const number = getNumber(type, format);
    if (!usedNumbers.has(number)) {
      usedNumbers.add(number);
      numbers.push(number);
    }
  }
  
  return numbers;
}

// Demo function to validate phone number format
export function validateNumber(phoneNumber: string): { isValid: boolean; format: string; country?: string } {
  console.log(`Validating phone number: ${phoneNumber}`);

  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Check for US format
  if (cleaned.match(/^\+?1\d{10}$/)) {
    return {
      isValid: true,
      format: 'us',
      country: 'United States'
    };
  }

  // Check for international format
  if (cleaned.match(/^\+\d{7,15}$/)) {
    const countryMap: { [key: string]: string } = {
      '+44': 'United Kingdom',
      '+49': 'Germany',
      '+33': 'France',
      '+81': 'Japan',
      '+86': 'China',
      '+91': 'India'
    };

    const countryCode = cleaned.substring(0, 3);
    return {
      isValid: true,
      format: 'international',
      country: countryMap[countryCode] || 'Unknown'
    };
  }

  return {
    isValid: false,
    format: 'invalid'
  };
}

// API Configuration
const API_URL = "https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/stablegold_calling";

const HEADERS = {
  'Content-Type': 'application/json',
};

// Dashboard statistics interface
export interface DashboardStats {
  totalHotels: number;
  totalClients: number;
}

// Backend API response format (snake_case)
export interface HotelApiResponse {
  hotel_id?: string;
  hotel_name: string;
  street_address?: string;
  city: string;
  estate: string;
  zip_code?: string;
  available_king: string;
  available_queen: string;
  price: string;
  checkin_time: string;
  checkout_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientApiResponse {
  client_id?: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  reservation_hotel: string;
  reservation_date: string;
  checkin_time: string;
  call_date: string;
  call_summary: string;
  to_follow_up: boolean;
  confirmation_status: string;
  occupants: string;
  created_at?: string;
  updated_at?: string;
}

// UI display format (title case for forms)
export interface Hotel {
  hotel_id?: string;
  'Hotel Name': string;
  'Street Address'?: string;
  'City': string;
  'State': string;
  'Zip Code'?: string;
  'Double Bed Available': string;
  'Single Bed Available': string;
  'Reservations': string;
  'Waiting List': string;
  'Price': string;
  'Checkin Time': string;
  'Checkout Time': string;
}

export interface Client {
  client_id?: string;
  'First Name': string;
  'Last Name': string;
  'Phone Number': string;
  'Reservation Hotel': string;
  'Reservation Date': string;
  'Checkin Time': string;
  'Call Date': string;
  'Call Summary': string;
  'To Follow Up': boolean;
  'Confirmation Status': string;
  'Occupants': string;
}

// Hotel API Functions
export const hotelAPI = {
  // Add a new hotel
  async addHotel(hotelData: Hotel) {
    // Convert title case to snake_case for API
    const apiData = {
      hotel_name: hotelData['Hotel Name'],
      street_address: hotelData['Street Address'],
      city: hotelData['City'],
      estate: hotelData['State'],
      zip_code: hotelData['Zip Code'],
      available_king: hotelData['Double Bed Available'],
      available_queen: hotelData['Single Bed Available'],
      price: hotelData['Price'],
      checkin_time: hotelData['Checkin Time'],
      checkout_time: hotelData['Checkout Time']
    };

    const payload = {
      action: "manage",
      entity: "hotels",
      mode: "append",
      data: apiData
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Query hotels
  async getHotels(filters?: { hotel_name?: string; city?: string; estate?: string }) {
    const payload = {
      action: "query",
      entity: "hotels",
      ...filters
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Update existing hotel
  async updateHotel(hotelId: string, hotelData: Hotel) {
    // Convert title case to snake_case for API
    const apiData = {
      "Hotel Name": hotelData['Hotel Name'],
      hotel_id: hotelId,
      street_address: hotelData['Street Address'] || '',
      city: hotelData['City'],
      estate: hotelData['State'],
      zip_code: hotelData['Zip Code'] || '',
      available_king: hotelData['Double Bed Available'],
      available_queen: hotelData['Single Bed Available'],
      price: hotelData['Price'],
      checkin_time: hotelData['Checkin Time'],
      checkout_time: hotelData['Checkout Time']
    };

    const payload = {
      entity: "hotels",
      action: "manage",
      mode: "update",
      data: apiData
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Bulk add hotels
  async addBulkHotels(hotelsData: Hotel[]) {
    const payload = {
      action: "manage",
      entity: "hotels",
      mode: "upsert",
      data: hotelsData
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Edit existing hotel (using POST API with action:manage, mode:update)
  async editHotel(hotelId: string, hotelData: Hotel) {
    const payload = {
      entity: "hotels",
      action: "manage",
      mode: "update",
      data: {
        "Hotel Name": hotelData['Hotel Name'],
        hotel_id: hotelId,
        street_address: hotelData['Street Address'] || '',
        city: hotelData['City'],
        estate: hotelData['State'],
        zip_code: hotelData['Zip Code'] || '',
        available_king: hotelData['Double Bed Available'],
        available_queen: hotelData['Single Bed Available'],
        price: hotelData['Price'],
        checkin_time: hotelData['Checkin Time'],
        checkout_time: hotelData['Checkout Time']
      }
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};

// Client API Functions
export const clientAPI = {
  // Add a new client
  async addClient(clientData: Client) {
    // Convert title case to snake_case for API
    const apiData = {
      first_name: clientData['First Name'],
      last_name: clientData['Last Name'],
      phone_number: clientData['Phone Number'],
      reservation_hotel: clientData['Reservation Hotel'],
      reservation_date: clientData['Reservation Date'],
      checkin_time: clientData['Checkin Time'],
      call_date: clientData['Call Date'],
      call_summary: clientData['Call Summary'],
      to_follow_up: clientData['To Follow Up'],
      confirmation_status: clientData['Confirmation Status'] || 'pending',
      occupants: clientData['Occupants'] || '1'
    };

    const payload = {
      action: "manage",
      entity: "clients",
      mode: "append",
      data: apiData
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Query clients
  async getClients(filters?: { first_name?: string; last_name?: string; phone?: string }) {
    const payload = {
      action: "query",
      entity: "clients",
      ...filters
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Update existing client
  async updateClient(clientId: string, firstName: string, lastName: string, fields: Partial<Client>) {
    const payload = {
      action: "update",
      entity: "clients",
      updates: [{
        client_id: clientId,
        first_name: firstName,
        last_name: lastName,
        fields: fields
      }]
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Edit existing client (using update action that backend supports)
  async editClient(clientId: string, clientData: Client) {
    // Convert title case to snake_case for API fields
    const fields = {
      phone_number: clientData['Phone Number'],
      reservation_hotel: clientData['Reservation Hotel'],
      reservation_date: clientData['Reservation Date'],
      checkin_time: clientData['Checkin Time'],
      call_date: clientData['Call Date'],
      call_summary: clientData['Call Summary'],
      to_follow_up: clientData['To Follow Up'],
      confirmation_status: clientData['Confirmation Status'] || 'pending',
      occupants: clientData['Occupants'] || '1'
    };

    const payload = {
      action: "update",
      entity: "clients",
      updates: [{
        client_id: clientId,
        first_name: clientData['First Name'],
        last_name: clientData['Last Name'],
        fields: fields
      }]
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Follow up with client (mock API for now)
  async followUpClient(clientData: Client) {
    try {
      console.log('Mock follow-up API call for client:', clientData);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock successful follow-up
      return {
        success: true,
        message: `Follow-up initiated for ${clientData['First Name']} ${clientData['Last Name']}`,
        followUpId: `followup_${Date.now()}`
      };
    } catch (error) {
      console.error('Failed to initiate follow-up:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Follow-up failed'
      };
    }
  }
};
