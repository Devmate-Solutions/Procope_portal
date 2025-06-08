import axios from 'axios';

export interface RetellCall {
  call_id: string;
  agent_id: string;
  version: number;
  call_status: string;
  start_timestamp: number;
  end_timestamp: number;
  duration_ms: number;
  transcript: string;
  recording_url: string;
  latency: {
    e2e: LatencyData;
    llm: LatencyData;
    tts: LatencyData;
    s2s: LatencyData;
    knowledge_base?: LatencyData;
    llm_websocket_network_rtt?: LatencyData;
  };
  disconnection_reason: string;
  call_analysis?: {
    call_summary?: string;
    in_voicemail?: boolean;
    user_sentiment?: string;
    call_successful?: boolean;
    custom_analysis_data?: any;
  };
  call_cost?: {
    product_costs?: Array<{product: string; unitPrice: number; cost: number}>;
    total_duration_seconds?: number;
    total_duration_unit_price?: number;
    total_one_time_price?: number;
    combined_cost?: number;
  };
  llm_token_usage?: {
    values?: number[];
    average?: number;
    num_requests?: number;
  };
  direction?: string;
}

interface LatencyData {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  min: number;
  num: number;
  values?: number[];
}

export interface RetellAnalyticsData {
  callCount: number;
  callDuration: {
    totalDuration: number;
    formattedDuration: string;
  };
  callLatency: number;
  callSuccessData: {
    successful: number;
    unsuccessful: number;
    unknown: number;
  };
  disconnectionData: {
    agent_hangup: number;
    user_hangup: number;
    inactivity: number;
    dial_failed: number;
    no_valid_payment: number;
    other: number;
  };
  directionData: {
    inbound: number;
    outbound: number;
    unknown: number;
  };
  callAnalytics: {
    sentiments: Record<string, number>;
    voicemails: number;
    totalCost: number;
    averageTokens: number;
  };
}

export interface CallFilterParams {
  agent_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  status?: string;
}

// Function to fetch data from Retell API
export const fetchRetellCalls = async (apiKey: string, filters: CallFilterParams): Promise<RetellCall[]> => {
  try {
    // Format the request payload properly
    const payload: any = { limit: filters.limit || 1000 };
    
    // Hard-coded target agent ID for consistency across the application
    const TARGET_AGENT_ID = 'agent_a3f5d1a7dd6d0abe1ded29a1fc';
    
    // Always use the target agent ID regardless of what's passed in
    payload.agent_id = TARGET_AGENT_ID;
   
    
    
    // Still include the date filters if provided
    if (filters.start_date) {
      payload.start_date = filters.start_date;
    }
    
    if (filters.end_date) {
      payload.end_date = filters.end_date;
    }
    
    if (filters.status) {
      payload.status = filters.status;
    }
    
  
    
    
    const response = await axios.post(
      'https://api.retellai.com/v2/list-calls',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Check if the response is in the expected format
    const data = response.data;
    let calls: RetellCall[] = [];
    
    if (Array.isArray(data)) {
      // Direct array of calls
      calls = data;
    } else if (data && Array.isArray(data.calls)) {
      // Object with calls property
      calls = data.calls;
    } else {
     
      
      return [];
    }
  
    
    
    // Additional client-side filtering to ensure we only get calls for our target agent
    const targetAgentId = 'agent_a3f5d1a7dd6d0abe1ded29a1fc';
    const filteredCalls = calls.filter(call => call.agent_id === targetAgentId);
    
    if (filteredCalls.length < calls.length) {
      
      
    }
    
    // For testing: If no calls returned, generate dummy data
    if (filteredCalls.length === 0) {
      
      
      const dummyCalls: RetellCall[] = [];
      
      // Create 5 inbound calls
      for (let i = 0; i < 5; i++) {
        dummyCalls.push({
          call_id: `dummy-inbound-${i}`,
          agent_id: filters.agent_id || '',
          version: 1,
          call_status: 'completed',
          start_timestamp: Date.now() - 3600000,
          end_timestamp: Date.now(),
          duration_ms: 180000,
          transcript: 'Sample transcript',
          recording_url: '',
          latency: {
            e2e: { p50: 250, p90: 350, p95: 400, p99: 450, max: 500, min: 200, num: 10 },
            llm: { p50: 200, p90: 300, p95: 350, p99: 400, max: 450, min: 150, num: 10 },
            tts: { p50: 50, p90: 80, p95: 90, p99: 100, max: 120, min: 30, num: 10 },
            s2s: { p50: 20, p90: 30, p95: 35, p99: 40, max: 50, min: 10, num: 10 }
          },
          disconnection_reason: 'user_hangup',
          direction: 'inbound'
        });
      }
      
      // Create 8 outbound calls
      for (let i = 0; i < 8; i++) {
        dummyCalls.push({
          call_id: `dummy-outbound-${i}`,
          agent_id: filters.agent_id || '',
          version: 1,
          call_status: 'completed',
          start_timestamp: Date.now() - 7200000,
          end_timestamp: Date.now() - 3600000,
          duration_ms: 120000,
          transcript: 'Sample transcript',
          recording_url: '',
          latency: {
            e2e: { p50: 250, p90: 350, p95: 400, p99: 450, max: 500, min: 200, num: 10 },
            llm: { p50: 200, p90: 300, p95: 350, p99: 400, max: 450, min: 150, num: 10 },
            tts: { p50: 50, p90: 80, p95: 90, p99: 100, max: 120, min: 30, num: 10 },
            s2s: { p50: 20, p90: 30, p95: 35, p99: 40, max: 50, min: 10, num: 10 }
          },
          disconnection_reason: 'agent_hangup',
          direction: 'outbound'
        });
      }
     
      
      return dummyCalls;
    }
    
    return filteredCalls;
  } catch (error) {
    
    
    throw new Error('Failed to fetch call data');
  }
};

// Process the raw API data into a format suitable for charts
export const processRetellAnalytics = (calls: RetellCall[]): RetellAnalyticsData => {
  // Call count
  const callCount = calls.length;
  
  // Calculate total duration
  const totalDuration = calls.reduce((total, call) => total + (call.duration_ms || 0), 0);
  const totalSeconds = Math.floor(totalDuration / 1000);
  
  // Format duration as readable string
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const formattedDuration = hours > 0 
    ? `${hours}h ${minutes}m ${seconds}s` 
    : minutes > 0 
      ? `${minutes}m ${seconds}s` 
      : `${seconds}s`;
  
  // Calculate average latency (e2e p50)
  const validLatencyCalls = calls.filter(call => call.latency?.e2e?.p50);
  const totalLatency = validLatencyCalls.reduce((sum, call) => sum + call.latency.e2e.p50, 0);
  const callLatency = validLatencyCalls.length > 0 ? Math.round(totalLatency / validLatencyCalls.length) : 0;
  
  // Process success data
  const callSuccessData = {
    successful: calls.filter(call => call.call_analysis?.call_successful === true).length,
    unsuccessful: calls.filter(call => call.call_analysis?.call_successful === false).length,
    unknown: calls.filter(call => call.call_analysis?.call_successful === undefined).length
  };
  
  // Process disconnection data
  const disconnectionData = {
    agent_hangup: calls.filter(call => call.disconnection_reason === 'agent_hangup').length,
    user_hangup: calls.filter(call => call.disconnection_reason === 'user_hangup').length,
    inactivity: calls.filter(call => call.disconnection_reason === 'inactivity').length,
    dial_failed: calls.filter(call => call.disconnection_reason === 'dial_failed').length,
    no_valid_payment: calls.filter(call => call.disconnection_reason === 'no_valid_payment').length,
    other: calls.filter(call => !['agent_hangup', 'user_hangup', 'inactivity', 'dial_failed', 'no_valid_payment'].includes(call.disconnection_reason || '')).length
  };
  
  // Process direction data from call metadata
  const directionData = {
    inbound: calls.filter(call => (call.direction || '').toLowerCase() === 'inbound').length,
    outbound: calls.filter(call => (call.direction || '').toLowerCase() === 'outbound').length,
    unknown: calls.filter(call => !call.direction || !['inbound', 'outbound'].includes(call.direction.toLowerCase())).length
  };
  
  // Process sentiment data
  const sentiments: Record<string, number> = {};
  calls.forEach(call => {
    if (call.call_analysis?.user_sentiment) {
      const sentiment = call.call_analysis.user_sentiment;
      sentiments[sentiment] = (sentiments[sentiment] || 0) + 1;
    }
  });
  
  // Count voicemails
  const voicemails = calls.filter(call => call.call_analysis?.in_voicemail === true).length;
  
  // Calculate total cost
  const totalCost = calls.reduce((sum, call) => {
    return sum + (call.call_cost?.combined_cost || 0);
  }, 0);
  
  // Calculate average token usage
  const callsWithTokens = calls.filter(call => call.llm_token_usage?.average);
  const averageTokens = callsWithTokens.length > 0
    ? Math.round(callsWithTokens.reduce((sum, call) => sum + (call.llm_token_usage?.average || 0), 0) / callsWithTokens.length)
    : 0;
  
  return {
    callCount,
    callDuration: {
      totalDuration: totalSeconds,
      formattedDuration
    },
    callLatency,
    callSuccessData,
    disconnectionData,
    directionData,
    callAnalytics: {
      sentiments,
      voicemails,
      totalCost,
      averageTokens
    }
  };
};

// Function to generate chart data for different metrics from Retell API data
export const generateChartData = (calls: RetellCall[], metricType: string, timeUnit: string) => {
  // Implementation will depend on the specific metric and time unit
  // This would format the data for the Chart.js component
  
  // For example, for call counts by day:
  if (metricType === 'Call Counts' && timeUnit === 'day') {
    // Group calls by day and count them
    const dayCountMap = new Map<string, number>();
    
    calls.forEach(call => {
      const date = new Date(call.start_timestamp);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      dayCountMap.set(day, (dayCountMap.get(day) || 0) + 1);
    });
    
    // Format for Chart.js
    return {
      labels: Array.from(dayCountMap.keys()),
      datasets: [{
        label: 'Call Counts',
        data: Array.from(dayCountMap.values()),
        backgroundColor: '#5B8FF9',
        borderColor: '#5B8FF9',
        borderWidth: 1,
      }]
    };
  }
  
  // Default empty data
  return {
    labels: [],
    datasets: [{
      label: metricType,
      data: [],
      backgroundColor: '#5B8FF9',
      borderColor: '#5B8FF9',
      borderWidth: 1,
    }]
  };
}; 