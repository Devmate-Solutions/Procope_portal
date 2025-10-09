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
const API_URL = "https://e2o38eg717.execute-api.us-east-1.amazonaws.com/P1/stable_gold";

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
  double_available: string;
  single_available: string;
  price: string;
  price_weekly?: string;
  amenities?: string;
  checkin_time: string;
  checkout_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientApiResponse {
  client_id?: string;
  phone_number: string;
  reservation_hotel: string;
  reservation_date: string;
  checkin_time: string;
  call_date: string;
  call_summary: string;
  to_follow_up: string | boolean;
  confirmation_status: string;
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
  'Double Bed': string;
  'Single Bed': string;
  'Reservations': string;
  'price_weekly'?: string;
  'Waiting List': string;
  'Amenities'?: string;
  'Price': string;
  'Checkin Time': string;
  'Checkout Time': string;
}

export interface Client {
  client_id?: string;
  'Phone Number': string;
  'Reservation Hotel': string;
  'Reservation Date': string;
  'Checkin Time': string;
  'Call Date': string;
  'Call Summary': string;
  'To Folllow Up': string | boolean;  // Note: keeping the typo from the API
  'Confirmation Status': string;
}

// Orders API Functions
export async function getAllOrders() {
  try {
    console.log('Fetching all orders from external API');

    const response = await fetch('https://1lqtkwm5jg.execute-api.us-east-1.amazonaws.com/v1/allorders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Orders API response status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Orders data received:', data);
    return data;

  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw error;
  }
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
      double_available: hotelData['Double Bed'],
      single_available: hotelData['Single Bed'],
      price: hotelData['Price'],
      price_weekly: hotelData['price_weekly'],
      amenities: hotelData['Amenities'],
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
      double_available: hotelData['Double Bed'],
      single_available: hotelData['Single Bed'],
      price: hotelData['Price'],
      amenities: hotelData['Amenities'],
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
        double_available: hotelData['Double Bed'],
        single_available: hotelData['Single Bed'],
        price: hotelData['Price'],
        price_weekly: hotelData['price_weekly'],
        amenities: hotelData['Amenities'],
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
  // Add a new client (manage with mode: append)
  async addClient(clientData: Client) {
    // Convert title case to API format (using title case fields as per API spec)
    const apiData = {
      "Phone Number": clientData['Phone Number'],
      "Reservation Hotel": clientData['Reservation Hotel'],
      "Reservation Date": clientData['Reservation Date'],
      "Checkin Time": clientData['Checkin Time'],
      "Call Date": clientData['Call Date'],
      "Call Summary": clientData['Call Summary'],
      "To Folllow Up": String(clientData['To Folllow Up'] || 'false'),  // Note: keeping the typo from API
      "Confirmation Status": clientData['Confirmation Status'] || 'pending'
    };

    const payload = {
      action: "manage",
      entity: "clients",
      mode: "append",
      data: [apiData]  // Wrap in array as per API spec
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
  async getClients(phoneNumber?: string) {
    const payload: any = {
      action: "query",
      entity: "clients"
    };

    // Add phone_number filter if provided
    if (phoneNumber) {
      payload.phone_number = phoneNumber;
    }

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

  // Update existing client (using update action)
  async updateClient(clientId: string, phoneNumber: string, fields: any) {
    const payload = {
      action: "update",
      entity: "clients",
      updates: [{
        client_id: clientId,
        phone_number: phoneNumber,
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

  // Edit existing client (using manage with mode: update)
  async editClient(clientId: string, clientData: Client) {
    // Convert to API format
    const apiData = {
      "Phone Number": clientData['Phone Number'],
      "Call Summary": clientData['Call Summary'],
      "Confirmation Status": clientData['Confirmation Status'] || 'pending',
      "Reservation Hotel": clientData['Reservation Hotel'],
      "Reservation Date": clientData['Reservation Date'],
      "Checkin Time": clientData['Checkin Time'],
      "Call Date": clientData['Call Date'],
      "To Folllow Up": String(clientData['To Folllow Up'] || 'false')
    };

    const payload = {
      action: "manage",
      entity: "clients",
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

  // Upsert client (create or update)
  async upsertClient(clientData: Client | Client[]) {
    const dataArray = Array.isArray(clientData) ? clientData : [clientData];

    const apiData = dataArray.map(client => ({
      "Phone Number": client['Phone Number'],
      "Reservation Hotel": client['Reservation Hotel'],
      "Reservation Date": client['Reservation Date'],
      "Checkin Time": client['Checkin Time'],
      "Call Date": client['Call Date'],
      "Call Summary": client['Call Summary'],
      "To Folllow Up": String(client['To Folllow Up'] || 'false'),
      "Confirmation Status": client['Confirmation Status'] || 'pending'
    }));

    const payload = {
      action: "manage",
      entity: "clients",
      mode: "upsert",
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

  // Delete client
  async deleteClient(clientId: string, phoneNumber: string) {
    const payload = {
      action: "delete",
      entity: "clients",
      clients: [{
        client_id: clientId,
        phone_number: phoneNumber
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
        message: `Follow-up initiated for ${clientData['Phone Number']}`,
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
