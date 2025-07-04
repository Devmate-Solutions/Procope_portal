import { cookies } from 'next/headers';
import { decodeToken, UserProfile } from '@/lib/auth';
import AuthenticatedLayout from '../components/AuthenticatedLayout';
import React from 'react';
import TranscriptHistory from '../components/AudiosTable';

interface Transcript {
  transcription_id: string;
  original_filename: string;
  status: string;
  created_at: string;
  user_email: string;
}

interface Audio {
  audio_id: string;
  transcription_id: string;
  original_filename: string;
  file_key: string;
  status: string;
  created_at: string;
}

async function getTranscriptsAndAudios(): Promise<{
  transcripts: Transcript[];
  audios: Audio[];
  error?: string;
  isLoading: boolean;
}> {
  try {
    const cookieStore = cookies();
    const tokenCookie = (await cookieStore).get('auth_token');
    const token = tokenCookie?.value;
    if (!token) {
      return { transcripts: [], audios: [], error: 'User not authenticated (no token)', isLoading: false };
    }
    const user = decodeToken(token) as UserProfile | null;
    if (!user) {
      return { transcripts: [], audios: [], error: 'Invalid or expired token', isLoading: false };
    }

    let isLoading = true;
    const [transcriptsRes, audiosRes] = await Promise.all([
      fetch(
        `https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/workspace/${user.workspaceId}/transcripts`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      ),
      fetch(
        `https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/workspace/${user.workspaceId}/audios`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      ),
    ]);

    if (!transcriptsRes.ok || !audiosRes.ok) {
      // Return loading state for 403 errors
      if (transcriptsRes.status === 403 || audiosRes.status === 403) {
        return { 
          transcripts: [], 
          audios: [], 
          error: 'Authorization check in progress... Please wait.', 
          isLoading: true 
        };
      }
      // For other errors, show the specific error message
      const errorMessage = !transcriptsRes.ok 
        ? `Transcripts API error: ${transcriptsRes.status}` 
        : `Audios API error: ${audiosRes.status}`;
      return { transcripts: [], audios: [], error: errorMessage, isLoading: false };
    }

    const transcriptsData = await transcriptsRes.json();
    const audiosData = await audiosRes.json();
    return {
      transcripts: transcriptsData.transcripts || [],
      audios: audiosData.audios || [],
      isLoading: false
    };
  } catch (err: any) {
    return { 
      transcripts: [], 
      audios: [], 
      error: err.message || 'Failed to fetch data', 
      isLoading: false 
    };
  }
}

export default async function ScribeHistoryPage() {
  const { transcripts, audios, error, isLoading } = await getTranscriptsAndAudios();

  // Get workspaceId from the decoded token
  const cookieStore = cookies();
  const tokenCookie = (await cookieStore).get('auth_token');
  const token = tokenCookie?.value;
  let workspaceId = '';
  if (token) {
    const user = decodeToken(token) as UserProfile | null;
    if (user) workspaceId = user.workspaceId;
  }

  return (
    <AuthenticatedLayout>
      <div className="bg-gray-50">
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Scribe History</h1>
            <p className="mt-2 text-sm text-gray-600">
              View and manage your transcription history and audio files
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Loading</h3>
                  <div className="mt-2 text-sm text-blue-700">Please wait while we verify your access...</div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {!error && !isLoading && (
            <div className="space-y-8">
              {/* Stats */}
                <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">📄</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                          Scribe History
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {transcripts.length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Transcript History */}
              <TranscriptHistory transcripts={transcripts} audios={audios} workspaceId={workspaceId} />
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}