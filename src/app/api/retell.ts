import { 
  fetchRetellCalls as fetchRetellCallsFromService, 
  processRetellAnalytics, 
  RetellAnalyticsData 
} from '../services/retellData';

// Base URL for Retell API
const RETELL_API_BASE = 'https://api.retellai.com';

// Create headers with API key
const getHeaders = (apiKey: string) => ({
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
});


// Add a constant for the target agent ID to ensure consistency
export const TARGET_AGENT_ID = 'agent_a3f5d1a7dd6d0abe1ded29a1fc';
export const TARGET_AGENT_NAME = 'Orasurge Outbound V2';

/**
 * Function to get agents - this now simply returns the target agent
 * without making an API call since we only need this specific agent
 */
export async function getAgents(apiKey: string): Promise<any[]> {

  
  
  // Return just the target agent
  return [{
    agent_id: 'agent_a3f5d1a7dd6d0abe1ded29a1fc',
    name: 'Orasurge Outbound V2',
    version: 1,
    llm_type: 'retell-llm'
  }];
}

/**
 * Function to get a single agent by ID using the /get-agent/{agent_id} endpoint
 */
export async function getAgentById(apiKey: string, agentId: string): Promise<any | null> {
 
  
  
  const url = `${RETELL_API_BASE}/get-agent/${agentId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(apiKey),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
 
      
      
      // For API failures, still return a fallback for the target agent
      if (agentId === 'agent_a3f5d1a7dd6d0abe1ded29a1fc') {
      
        
        return {
          agent_id: 'agent_a3f5d1a7dd6d0abe1ded29a1fc',
          name: 'Orasurge Outbound V2',
          version: 1,
          llm_type: 'retell-llm'
        };
      }
      
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }
    
    const agent = await response.json();
  
    
    
    return {
      agent_id: agent.agent_id,
      name: agent.agent_name || 'Unnamed Agent',
      version: agent.version || 1,
      llm_type: agent.response_engine?.type || 'unknown'
    };
  } catch (error) {
    
    
    
    // For any other error, still return a fallback for the target agent
    if (agentId === 'agent_a3f5d1a7dd6d0abe1ded29a1fc') {
      
      return {
        agent_id: 'agent_a3f5d1a7dd6d0abe1ded29a1fc',
        name: 'Orasurge Outbound V2',
        version: 1,
        llm_type: 'retell-llm'
      };
    }
    
    return null;
  }
}

/**
 * Function to fetch calls with pagination handling
 */
async function fetchCallsWithPagination(apiKey: string, filters?: any) {
  const url = `${RETELL_API_BASE}/v2/list-calls`;
  let paginationKey = null;
  let allCalls: any[] = [];
  
  // Add exponential backoff mechanism for rate limiting
  let retryCount = 0;
  const MAX_RETRIES = 3;
  
  // Ensure we have valid filters
  const validFilters = filters || {};
  
  // Make sure the agent_id is always set
  if (!validFilters.agent_id) {
    validFilters.agent_id = 'agent_a3f5d1a7dd6d0abe1ded29a1fc';
  }

  while (true) {
    const payload: any = { limit: 1000 };
    if (paginationKey) {
      payload.pagination_key = paginationKey;
    }
    
    // Add filters if provided
    if (validFilters.agent_id) {
      payload.agent_id = validFilters.agent_id.trim();
      
    }
    if (validFilters.start_date) {
      payload.start_date = validFilters.start_date;
    }
    if (validFilters.end_date) {
      payload.end_date = validFilters.end_date;
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(apiKey),
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();

        
        // Handle rate limiting (429) with exponential backoff
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
         
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry the request
        }
        
        throw new Error(`Failed to fetch calls: ${response.statusText}`);
      }
      
      // Reset retry counter on success
      retryCount = 0;
      
      const data = await response.json();
      
      if (!data || (!Array.isArray(data) && !data.calls)) {
 
        break;
      }
      
      const calls = Array.isArray(data) ? data : data.calls;
      allCalls = allCalls.concat(calls);
      
      // Check if we have a next page
      if (!Array.isArray(data) && data.pagination_key) {
        paginationKey = data.pagination_key;
      } else {
        break; // No more pages
      }
    } catch (error) {
     
      break;
    }
  }
  
  return allCalls;
}

// This function gets all the data needed for the analytics dashboard
export async function getAnalyticsDashboardData(apiKey: string, filters: any = {}) {
  // Always ensure we're using the target agent ID
  const enhancedFilters = {
    ...filters,
    agent_id: TARGET_AGENT_ID
  };
  
 
  
  try {
    // Get all data in one go
    return await fetchRetellAnalyticsData(apiKey, enhancedFilters);
  } catch (error) {
    
    
    throw error;
  }
}

// Helper function to fetch and process analytics data
async function fetchRetellAnalyticsData(apiKey: string, filters: any): Promise<RetellAnalyticsData> {
  // Check if we have valid cached data matching the current filters
  const now = Date.now();
  
 
  // Fetch raw call data from Retell API
  const calls = await fetchRetellCallsFromService(apiKey, filters);
  
  // Process the raw data into analytics format
  const analyticsData = processRetellAnalytics(calls);
  

  return analyticsData;
}


/**
 * Function to get call history
 */
export async function getCallHistory(apiKey: string, filters?: any) {
  // Ensure we always have the target agent ID in the filters
  const agentFilters = { 
    ...filters,
    agent_id: 'agent_a3f5d1a7dd6d0abe1ded29a1fc' 
  };
  

  
  
  return fetchCallsWithPagination(apiKey, agentFilters);
}

