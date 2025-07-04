import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeToken, UserProfile } from '@/lib/auth';

interface ClinicalData {
  overall_summary?: string;
  diagnosis?: {
    identified_issues?: string[];
    clinical_findings?: string[];
  };
  differential_diagnosis?: string[];
  treatment_plan?: {
    medications?: string[];
    procedures?: string[];
  };
  lifestyle_recommendations?: string[];
  follow_up?: string[];
  additional_notes?: string[];
  status?: string;
  processing_time?: string;
  model_used?: string;
}

interface TranscriptDownloadResponse {
  transcription_id: string;
  download_url: string;
  original_filename: string;
  expires_in: number;
  status: string;
  clinical_data?: ClinicalData;
}

export async function POST(request: NextRequest) {
  try {
    // Get the transcription_id from request body
    const { transcription_id } = await request.json();
    
    if (!transcription_id) {
      return NextResponse.json(
        { error: 'Transcription ID is required' },
        { status: 400 }
      );
    }

    // Get auth token from cookies
    const cookieStore = cookies();
    const tokenCookie = (await cookieStore).get('auth_token');
    const token = tokenCookie?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Decode token to get user info
    const user = decodeToken(token) as UserProfile | null;
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Make API call to get download URL
    const response = await fetch(
      `https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/workspace/${user.workspaceId}/transcripts/${transcription_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    // Parse the response data
    const data = await response.json();
    
    // Check if clinical data is available in the response
    // If not, try to fetch it separately or create a mock for testing
    let clinicalData: ClinicalData | undefined = data.clinical_data;
    
    // If clinical data is not available in the response, we could fetch it separately
    // or create a mock for testing purposes
    if (!clinicalData && data.status === 'completed') {
      try {
        // Try to fetch clinical data separately
        const clinicalResponse = await fetch(
          `https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/workspace/${user.workspaceId}/transcripts/${transcription_id}/clinical`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (clinicalResponse.ok) {
          clinicalData = await clinicalResponse.json();
        }
      } catch (error) {
        console.error('Failed to fetch clinical data:', error);
        // Continue without clinical data
      }
    }
    
    // Return the combined response
    const result: TranscriptDownloadResponse = {
      ...data,
      clinical_data: clinicalData
    };
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Download transcript API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 