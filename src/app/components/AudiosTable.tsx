'use client';

import React, { useState } from 'react';

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

interface AudioDownloadResponse {
  audio_id: string;
  download_url: string;
  original_filename: string;
  expires_in: number;
  status: string;
}

interface TranscriptDownloadResponse {
  transcription_id: string;
  download_url: string;
  original_filename: string;
  expires_in: number;
  status: string;
}

function getStatusBadge(status: string) {
  const statusStyles = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  
  const style = statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800 border-gray-200';
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TranscriptsTable({ transcripts, workspaceId }: { transcripts: Transcript[]; workspaceId: string }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (transcriptionId: string, filename: string) => {
    try {
      setDownloadingId(transcriptionId);
      const res = await fetch('/api/download-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcription_id: transcriptionId }),
      });
      if (!res.ok) throw new Error('Failed to get download URL');
      const data: TranscriptDownloadResponse = await res.json();
      // Open the download URL in a new tab
      window.open(data.download_url, '_blank');
    } catch (e) {
      alert('Failed to download transcript. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (transcripts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transcripts found</h3>
          <p className="text-gray-500">Your transcripts will appear here once you upload audio files.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transcript ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Filename
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transcripts.map((t) => (
              <tr key={t.transcription_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {t.transcription_id.substring(0, 8)}...
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">📄</span>
                    <div>
                      <div className="font-medium">{t.original_filename}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(t.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{new Date(t.created_at).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(t.created_at).toLocaleTimeString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {t.user_email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {t.status === 'completed' ? (
                    <button
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                      onClick={() => handleDownload(t.transcription_id, t.original_filename)}
                      disabled={downloadingId === t.transcription_id}
                    >
                      <span className="mr-1">⬇️</span>
                      {downloadingId === t.transcription_id ? 'Downloading...' : 'Download JSON'}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">Processing...</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AudiosTable({ audios }: { audios: Audio[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleDownload = async (audioId: string, filename: string) => {
    try {
      setDownloading(audioId);
      setToast({ message: `Downloading ${filename}...`, type: 'info' });
      const response = await fetch('/api/download-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_id: audioId }),
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data: AudioDownloadResponse = await response.json();
      // Open the download URL in a new tab
      window.open(data.download_url, '_blank');
      setToast({ message: `Download of ${filename} started in a new tab!`, type: 'success' });
    } catch (error) {
      console.error('Download failed:', error);
      setToast({ message: 'Failed to download audio file. Please try again.', type: 'error' });
    } finally {
      setDownloading(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (audios.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No audio files found</h3>
          <p className="text-gray-500">Your audio files will appear here after uploading and processing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border ">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded shadow-lg text-white transition-all
            ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}
        >
          {toast.message}
        </div>
      )}
      <div className="">
        <table className=" ">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Audio ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Filename
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
             
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {audios.map((a) => (
              <tr key={a.audio_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {a.audio_id}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    
                    <div>
                      <div className="font-medium">{a.original_filename}</div>
                      <div className="text-xs text-gray-500">{a.file_key}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(a.status)}
                </td>
               
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{new Date(a.created_at).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleTimeString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {a.status === 'completed' ? (
                      <button
                        onClick={() => handleDownload(a.audio_id, a.original_filename)}
                        disabled={downloading === a.audio_id}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloading === a.audio_id ? (
                          <>
                            <span className="mr-1">⏳</span>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <span className="mr-1">⬇️</span>
                            Download
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">Not available</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ScribeHistoryTabs({ 
  transcripts, 
  audios, 
  workspaceId
}: { 
  transcripts: Transcript[]; 
  audios: Audio[]; 
  workspaceId: string;
}) {
  const [activeTab, setActiveTab] = useState<'transcripts' | 'audios'>('transcripts');

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('transcripts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'transcripts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <span className="mr-2">📄</span>
              Transcripts
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {transcripts.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('audios')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'audios'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <span className="mr-2">🎵</span>
              Audio Files
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {audios.length}
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'transcripts' && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Transcripts</h3>
              <p className="text-sm text-gray-600">View and manage your transcription history</p>
            </div>
            <TranscriptsTable transcripts={transcripts} workspaceId={workspaceId} />
          </div>
        )}

        {activeTab === 'audios' && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Audio Files</h3>
              <p className="text-sm text-gray-600">Download your original audio recordings</p>
            </div>
            <AudiosTable audios={audios} />
          </div>
        )}
      </div>
    </div>
  );
}