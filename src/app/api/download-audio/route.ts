import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeToken, UserProfile } from '@/lib/auth';

interface AudioDownloadResponse {
  audio_id: string;
  download_url: string;
  original_filename: string;
  expires_in: number;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get the audio_id from request body
    const { audio_id } = await request.json();
    
    if (!audio_id) {
      return NextResponse.json(
        { error: 'Audio ID is required' },
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
      `https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/workspace/${user.workspaceId}/audios/${audio_id}`,
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

    const data: AudioDownloadResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Download audio API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}