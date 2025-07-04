'use client';

import React, { useState } from 'react';

interface Transcript {
  transcription_id: string;
  original_filename: string;
  status: string;
  created_at: string;
  user_email: string;
  pat_name?: string;
  pat_num?: string;
  audio_filename?: string;
}

interface Audio {
  audio_id: string;
  transcription_id: string;
  original_filename: string;
  file_key: string;
  status: string;
  created_at: string;
  pat_name?: string;
  pat_num?: string;
}

// Clinical data interface for the transcript JSON response
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

interface TranscriptResponse {
  transcription_id: string;
  download_url: string;
  original_filename: string;
  expires_in: number;
  status: string;
  clinical_data?: ClinicalData;
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

function TranscriptsTable({ transcripts, audios, workspaceId }: { 
  transcripts: Transcript[]; 
  audios: Audio[];
  workspaceId: string; 
}) {
  // Debug: Log transcripts data
  console.log('Transcripts Data:', transcripts);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Search filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'patName' | 'patNum' | 'audioFilename'>('all');
  const [isSearching, setIsSearching] = useState(false);
  
  // Map audio filenames to transcripts
  const transcriptsWithAudio = transcripts.map(transcript => {
    const matchingAudio = audios.find(audio => audio.transcription_id === transcript.transcription_id);
    return {
      ...transcript,
      audio_filename: matchingAudio ? matchingAudio.original_filename : 'N/A'
    };
  });
  
  // Filter transcripts based on search term
  const filteredTranscripts = React.useMemo(() => {
    // Don't set state here - this causes infinite renders
    return transcriptsWithAudio.filter(transcript => {
      if (!searchTerm.trim()) return true;
      
      const term = searchTerm.toLowerCase().trim();
      
      switch (searchField) {
        case 'patName':
          return ((transcript as any).pat_name || (transcript as any).patName || '').toLowerCase().includes(term);
        case 'patNum':
          return ((transcript as any).pat_num || (transcript as any).patNum || '').toLowerCase().includes(term);
        case 'audioFilename':
          return (transcript.audio_filename || '').toLowerCase().includes(term);
        case 'all':
        default:
          return (
            ((transcript as any).pat_name || (transcript as any).patName || '').toLowerCase().includes(term) ||
            ((transcript as any).pat_num || (transcript as any).patNum || '').toLowerCase().includes(term) ||
            (transcript.audio_filename || '').toLowerCase().includes(term)
          );
      }
    });
  }, [transcriptsWithAudio, searchTerm, searchField]);
  
  // Handle search loading state separately
  React.useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => setIsSearching(false), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchField]);
  
  const totalPages = Math.ceil(filteredTranscripts.length / pageSize);
  const paginatedTranscripts = filteredTranscripts.slice((page - 1) * pageSize, page * pageSize);
  
  // Reset page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, searchField]);

  // PDF download logic for clinical data JSON
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
      
      if (!res.ok) throw new Error('Failed to get transcript data');
      
      const data: TranscriptResponse = await res.json();
      
      // Check if we have clinical data to process
      if (data.clinical_data) {
        generatePDFFromClinicalData(data.clinical_data, filename);
      } else if (data.download_url) {
        // Fallback to the old behavior if no clinical data
      window.open(data.download_url, '_blank');
      } else {
        throw new Error('No clinical data or download URL available');
      }
    } catch (e) {
      console.error('Download error:', e);
      alert('Failed to download transcript. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };
  
  // Generate PDF from clinical data
  const generatePDFFromClinicalData = (clinicalData: ClinicalData, filename: string) => {
    // Create a hidden iframe to print from
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'absolute';
    printIframe.style.top = '-9999px';
    printIframe.style.left = '-9999px';
    document.body.appendChild(printIframe);
    
    const documentTitle = `Clinical Report - ${filename}`;
    
    // Format array items for HTML display
    const formatArrayItems = (items?: string[]) => {
      if (!items || items.length === 0) return '<p class="text-gray-500 italic">None specified</p>';
      return `<ul class="list-disc pl-5 space-y-1">
        ${items.map(item => `<li>${item}</li>`).join('')}
      </ul>`;
    };
    
    // Build PDF content with styling
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documentTitle}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px; 
            color: #333;
          }
          h1 { color: #2563eb; margin-bottom: 16px; }
          h2 { color: #4b5563; margin-top: 24px; margin-bottom: 12px; }
          h3 { color: #6b7280; margin-top: 16px; margin-bottom: 8px; }
          .info { 
            background: #f3f4f6; 
            padding: 12px; 
            border-radius: 4px;
            margin-bottom: 24px;
          }
          .section {
            margin-bottom: 24px;
            background: white;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
          }
          footer {
            margin-top: 40px;
            font-size: 0.8em;
            color: #6b7280;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
          }
        </style>
      </head>
      <body>
        <h1>${documentTitle}</h1>
        
        <div class="info">
          <p><strong>Status:</strong> ${clinicalData.status || 'Unknown'}</p>
          <p><strong>Processing Time:</strong> ${clinicalData.processing_time ? new Date(clinicalData.processing_time).toLocaleString() : 'Unknown'}</p>
          <p><strong>Model Used:</strong> ${clinicalData.model_used || 'Unknown'}</p>
        </div>
        
        ${clinicalData.overall_summary ? `
        <div class="section">
          <h2>Overall Summary</h2>
          <p>${clinicalData.overall_summary}</p>
        </div>
        ` : ''}
        
        ${clinicalData.diagnosis ? `
        <div class="section">
          <h2>Diagnosis</h2>
          
          ${clinicalData.diagnosis.identified_issues ? `
          <h3>Identified Issues</h3>
          ${formatArrayItems(clinicalData.diagnosis.identified_issues)}
          ` : ''}
          
          ${clinicalData.diagnosis.clinical_findings ? `
          <h3>Clinical Findings</h3>
          ${formatArrayItems(clinicalData.diagnosis.clinical_findings)}
          ` : ''}
        </div>
        ` : ''}
        
        ${clinicalData.differential_diagnosis ? `
        <div class="section">
          <h2>Differential Diagnosis</h2>
          ${formatArrayItems(clinicalData.differential_diagnosis)}
        </div>
        ` : ''}
        
        ${clinicalData.treatment_plan ? `
        <div class="section">
          <h2>Treatment Plan</h2>
          
          ${clinicalData.treatment_plan.medications ? `
          <h3>Medications</h3>
          ${formatArrayItems(clinicalData.treatment_plan.medications)}
          ` : ''}
          
          ${clinicalData.treatment_plan.procedures ? `
          <h3>Procedures</h3>
          ${formatArrayItems(clinicalData.treatment_plan.procedures)}
          ` : ''}
        </div>
        ` : ''}
        
        ${clinicalData.lifestyle_recommendations ? `
        <div class="section">
          <h2>Lifestyle Recommendations</h2>
          ${formatArrayItems(clinicalData.lifestyle_recommendations)}
        </div>
        ` : ''}
        
        ${clinicalData.follow_up ? `
        <div class="section">
          <h2>Follow-up</h2>
          ${formatArrayItems(clinicalData.follow_up)}
        </div>
        ` : ''}
        
        ${clinicalData.additional_notes ? `
        <div class="section">
          <h2>Additional Notes</h2>
          ${formatArrayItems(clinicalData.additional_notes)}
        </div>
        ` : ''}
        
        <footer>
          Generated by MyDent | ${new Date().toLocaleDateString()}
        </footer>
      </body>
      </html>
    `;
    
    // Write the content to the iframe
    const iframeDocument = printIframe.contentWindow?.document;
    if (iframeDocument) {
      iframeDocument.open();
      iframeDocument.write(content);
      iframeDocument.close();
      
      // Wait for content to load
      setTimeout(() => {
        // Print/save as PDF
        printIframe.contentWindow?.print();
        
        // Remove the iframe after printing
        setTimeout(() => {
          document.body.removeChild(printIframe);
        }, 100);
      }, 500);
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
      {/* Search and filter controls */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search transcripts"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchTerm('');
                }
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
          <div className="md:w-48">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Fields</option>
              <option value="patName">Patient Name</option>
              <option value="patNum">Patient Number</option>
              <option value="audioFilename">Audio Filename</option>
            </select>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {filteredTranscripts.length} {filteredTranscripts.length === 1 ? 'result' : 'results'} found
          {searchTerm && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setSearchField('all');
              }}
              className="ml-2 text-blue-500 hover:text-blue-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {isSearching ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-2"></div>
            <p className="text-gray-600">Searching...</p>
          </div>
        ) : filteredTranscripts.length === 0 && searchTerm ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audio Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF Download</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTranscripts.map((t) => (
              <tr key={t.transcription_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(t as any).pat_name || (t as any).patName || <span className="text-gray-400 italic">N/A</span>}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(t as any).pat_num || (t as any).patNum || <span className="text-gray-400 italic">N/A</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.audio_filename || <span className="text-gray-400 italic">N/A</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{new Date(t.created_at).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(t.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {t.status === 'completed' ? (
                    <button
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                      onClick={() => handleDownload(t.transcription_id, t.original_filename)}
                      disabled={downloadingId === t.transcription_id}
                    >
                      <span className="mr-1">📄</span>
                      {downloadingId === t.transcription_id ? 'Downloading...' : 'Download PDF'}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">Processing...</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      {/* Pagination Controls */}
      {filteredTranscripts.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-4">
          <button
            className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function TranscriptHistory({ 
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
            <TranscriptsTable transcripts={transcripts} audios={audios} workspaceId={workspaceId} />
          </div>
        )}

      
      </div>
    </div>
  );
}