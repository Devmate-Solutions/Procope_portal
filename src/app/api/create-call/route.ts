import { NextRequest, NextResponse } from 'next/server';
import { createCall } from '@/lib/aws-api';

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
    // Parse the request body
    const requestData: CreateCallRequest = await request.json();
    
    // Validate request data
    if (!requestData.from_number || !requestData.to_number || !requestData.override_agent_id) {
      return NextResponse.json(
        { error: 'Missing required fields: from_number, to_number, and override_agent_id are required' },
        { status: 400 }
      );
    }
    
    // Call the AWS API
    const data = await createCall(requestData);
    
    return NextResponse.json(data, { status: 201 });
    
  } catch (error: any) {
    console.error('Failed to create call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create call' },
      { status: 500 }
    );
  }
}
