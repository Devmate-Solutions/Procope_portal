import { NextRequest, NextResponse } from 'next/server';

// Types for our request payload
interface CreateCallRequest {
  from_number: string;
  to_number: string;
  override_agent_id: string;
  override_agent_version?: number;
  retell_llm_dynamic_variables?: {
    customer_name?: string;
  };
  metadata?: Record<string, any>;
}

// Process a POST request to create a call
export async function POST(request: NextRequest) {
  try {
    // Check if API key is set
    const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Parse the request body
    const requestData: CreateCallRequest = await request.json();
    
  
    
    
    // Validate request data
    if (!requestData.from_number || !requestData.to_number || !requestData.override_agent_id) {
      return NextResponse.json(
        { error: 'Missing required fields: from_number, to_number, and override_agent_id are required' },
        { status: 400 }
      );
    }
    
    
    const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...requestData,
        override_agent_version: requestData.override_agent_version || 1
      }),
    });
    
    // Handle errors from Retell API
    if (!response.ok) {
      const errorData = await response.text();
     
      
      return NextResponse.json(
        { error: `Retell API error: ${errorData}` },
        { status: response.status }
      );
    }
    
    // Return the successful response
    const data = await response.json();
    
    return NextResponse.json(data, { status: 201 });
    
  } catch (error: any) {
  
    
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
} 