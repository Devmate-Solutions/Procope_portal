// 'use client';

// import React, { useState } from 'react';

// interface Transcript {
//   transcription_id: string;
//   original_filename: string;
//   status: string;
//   created_at: string;
//   user_email: string;
//   pat_name?: string;
//   pat_num?: string;
//   audio_filename?: string;
// }

// interface Audio {
//   audio_id: string;
//   transcription_id: string;
//   original_filename: string;
//   file_key: string;
//   status: string;
//   created_at: string;
//   pat_name?: string;
//   pat_num?: string;
// }

// // Clinical data interface for the transcript JSON response
// interface ClinicalData {
//   overall_summary?: string;
//   diagnosis?: {
//     identified_issues?: string[];
//     clinical_findings?: string[];
//   };
//   differential_diagnosis?: string[];
//   treatment_plan?: {
//     medications?: string[];
//     procedures?: string[];
//   };
//   lifestyle_recommendations?: string[];
//   follow_up?: string[];
//   additional_notes?: string[];
//   status?: string;
//   processing_time?: string;
//   model_used?: string;
// }

// interface TranscriptResponse {
//   transcription_id: string;
//   download_url: string;
//   original_filename: string;
//   expires_in: number;
//   status: string;
//   clinical_data?: ClinicalData;
// }

// function getStatusBadge(status: string) {
//   const statusStyles = {
//     completed: 'bg-green-100 text-green-800 border-green-200',
//     processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
//     failed: 'bg-red-100 text-red-800 border-red-200',
//     pending: 'bg-blue-100 text-blue-800 border-blue-200',
//   };
  
//   const style = statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800 border-gray-200';
  
//   return (
//     <span className={`px-2 py-1 rounded-full text-xs font-medium border ${style}`}>
//       {status.charAt(0).toUpperCase() + status.slice(1)}
//     </span>
//   );
// }

// function TranscriptsTable({ transcripts, audios, workspaceId }: { 
//   transcripts: Transcript[]; 
//   audios: Audio[];
//   workspaceId: string; 
// }) {
//   // Debug: Log transcripts data
//   console.log('Transcripts Data:', transcripts);
//   const [downloadingId, setDownloadingId] = useState<string | null>(null);
//   const [page, setPage] = useState(1);
//   const pageSize = 10;
  
//   // Search filter state
//   const [searchTerm, setSearchTerm] = useState('');
//   const [searchField, setSearchField] = useState<'all' | 'patName' | 'patNum' | 'audioFilename'>('all');
//   const [isSearching, setIsSearching] = useState(false);
  
//   // Map audio filenames to transcripts
//   const transcriptsWithAudio = transcripts.map(transcript => {
//     const matchingAudio = audios.find(audio => audio.transcription_id === transcript.transcription_id);
//     return {
//       ...transcript,
//       audio_filename: matchingAudio ? matchingAudio.original_filename : 'N/A'
//     };
//   });
  
//   // Filter transcripts based on search term
//   const filteredTranscripts = React.useMemo(() => {
//     // Don't set state here - this causes infinite renders
//     return transcriptsWithAudio.filter(transcript => {
//       if (!searchTerm.trim()) return true;
      
//       const term = searchTerm.toLowerCase().trim();
      
//       switch (searchField) {
//         case 'patName':
//           return ((transcript as any).pat_name || (transcript as any).patName || '').toLowerCase().includes(term);
//         case 'patNum':
//           return ((transcript as any).pat_num || (transcript as any).patNum || '').toLowerCase().includes(term);
//         case 'audioFilename':
//           return (transcript.audio_filename || '').toLowerCase().includes(term);
//         case 'all':
//         default:
//           return (
//             ((transcript as any).pat_name || (transcript as any).patName || '').toLowerCase().includes(term) ||
//             ((transcript as any).pat_num || (transcript as any).patNum || '').toLowerCase().includes(term) ||
//             (transcript.audio_filename || '').toLowerCase().includes(term)
//           );
//       }
//     });
//   }, [transcriptsWithAudio, searchTerm, searchField]);
  
//   // Handle search loading state separately
//   React.useEffect(() => {
//     setIsSearching(true);
//     const timer = setTimeout(() => setIsSearching(false), 300);
//     return () => clearTimeout(timer);
//   }, [searchTerm, searchField]);
  
//   const totalPages = Math.ceil(filteredTranscripts.length / pageSize);
//   const paginatedTranscripts = filteredTranscripts.slice((page - 1) * pageSize, page * pageSize);
  
//   // Reset page when search changes
//   React.useEffect(() => {
//     setPage(1);
//   }, [searchTerm, searchField]);

//   // PDF download logic for clinical data JSON
//   const handleDownload = async (transcriptionId: string, filename: string) => {
//     try {
//       setDownloadingId(transcriptionId);
//       const res = await fetch('/api/download-transcript', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ transcription_id: transcriptionId }),
//       });
      
//       if (!res.ok) throw new Error('Failed to get transcript data');
      
//       const data: TranscriptResponse = await res.json();
      
//       // Check if we have clinical data to process
//       if (data.clinical_data) {
//         generatePDFFromClinicalData(data.clinical_data, filename);
//       } else if (data.download_url) {
//         // Fallback to the old behavior if no clinical data
//       window.open(data.download_url, '_blank');
//       } else {
//         throw new Error('No clinical data or download URL available');
//       }
//     } catch (e) {
//       console.error('Download error:', e);
//       alert('Failed to download transcript. Please try again.');
//     } finally {
//       setDownloadingId(null);
//     }
//   };
  
//   // Generate PDF from clinical data
//   const generatePDFFromClinicalData = (clinicalData: ClinicalData, filename: string) => {
//     // Create a hidden iframe to print from
//     const printIframe = document.createElement('iframe');
//     printIframe.style.position = 'absolute';
//     printIframe.style.top = '-9999px';
//     printIframe.style.left = '-9999px';
//     document.body.appendChild(printIframe);
    
//     const documentTitle = `Clinical Report - ${filename}`;
    
//     // Format array items for HTML display
//     const formatArrayItems = (items?: string[]) => {
//       if (!items || items.length === 0) return '<p class="text-gray-500 italic">None specified</p>';
//       return `<ul class="list-disc pl-5 space-y-1">
//         ${items.map(item => `<li>${item}</li>`).join('')}
//       </ul>`;
//     };
    
//     // Build PDF content with styling
//     const content = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <title>${documentTitle}</title>
//         <style>
//           body { 
//             font-family: Arial, sans-serif; 
//             line-height: 1.6; 
//             margin: 40px; 
//             color: #333;
//           }
//           h1 { color: #2563eb; margin-bottom: 16px; }
//           h2 { color: #4b5563; margin-top: 24px; margin-bottom: 12px; }
//           h3 { color: #6b7280; margin-top: 16px; margin-bottom: 8px; }
//           .info { 
//             background: #f3f4f6; 
//             padding: 12px; 
//             border-radius: 4px;
//             margin-bottom: 24px;
//           }
//           .section {
//             margin-bottom: 24px;
//             background: white;
//             padding: 16px;
//             border: 1px solid #e5e7eb;
//             border-radius: 4px;
//           }
//           footer {
//             margin-top: 40px;
//             font-size: 0.8em;
//             color: #6b7280;
//             text-align: center;
//             border-top: 1px solid #e5e7eb;
//             padding-top: 12px;
//           }
//         </style>
//       </head>
//       <body>
//         <h1>${documentTitle}</h1>
        
//         <div class="info">
//           <p><strong>Status:</strong> ${clinicalData.status || 'Unknown'}</p>
//           <p><strong>Processing Time:</strong> ${clinicalData.processing_time ? new Date(clinicalData.processing_time).toLocaleString() : 'Unknown'}</p>
//           <p><strong>Model Used:</strong> ${clinicalData.model_used || 'Unknown'}</p>
//         </div>
        
//         ${clinicalData.overall_summary ? `
//         <div class="section">
//           <h2>Overall Summary</h2>
//           <p>${clinicalData.overall_summary}</p>
//         </div>
//         ` : ''}
        
//         ${clinicalData.diagnosis ? `
//         <div class="section">
//           <h2>Diagnosis</h2>
          
//           ${clinicalData.diagnosis.identified_issues ? `
//           <h3>Identified Issues</h3>
//           ${formatArrayItems(clinicalData.diagnosis.identified_issues)}
//           ` : ''}
          
//           ${clinicalData.diagnosis.clinical_findings ? `
//           <h3>Clinical Findings</h3>
//           ${formatArrayItems(clinicalData.diagnosis.clinical_findings)}
//           ` : ''}
//         </div>
//         ` : ''}
        
//         ${clinicalData.differential_diagnosis ? `
//         <div class="section">
//           <h2>Differential Diagnosis</h2>
//           ${formatArrayItems(clinicalData.differential_diagnosis)}
//         </div>
//         ` : ''}
        
//         ${clinicalData.treatment_plan ? `
//         <div class="section">
//           <h2>Treatment Plan</h2>
          
//           ${clinicalData.treatment_plan.medications ? `
//           <h3>Medications</h3>
//           ${formatArrayItems(clinicalData.treatment_plan.medications)}
//           ` : ''}
          
//           ${clinicalData.treatment_plan.procedures ? `
//           <h3>Procedures</h3>
//           ${formatArrayItems(clinicalData.treatment_plan.procedures)}
//           ` : ''}
//         </div>
//         ` : ''}
        
//         ${clinicalData.lifestyle_recommendations ? `
//         <div class="section">
//           <h2>Lifestyle Recommendations</h2>
//           ${formatArrayItems(clinicalData.lifestyle_recommendations)}
//         </div>
//         ` : ''}
        
//         ${clinicalData.follow_up ? `
//         <div class="section">
//           <h2>Follow-up</h2>
//           ${formatArrayItems(clinicalData.follow_up)}
//         </div>
//         ` : ''}
        
//         ${clinicalData.additional_notes ? `
//         <div class="section">
//           <h2>Additional Notes</h2>
//           ${formatArrayItems(clinicalData.additional_notes)}
//         </div>
//         ` : ''}
        
//         <footer>
//           Generated by MyDent | ${new Date().toLocaleDateString()}
//         </footer>
//       </body>
//       </html>
//     `;
    
//     // Write the content to the iframe
//     const iframeDocument = printIframe.contentWindow?.document;
//     if (iframeDocument) {
//       iframeDocument.open();
//       iframeDocument.write(content);
//       iframeDocument.close();
      
//       // Wait for content to load
//       setTimeout(() => {
//         // Print/save as PDF
//         printIframe.contentWindow?.print();
        
//         // Remove the iframe after printing
//         setTimeout(() => {
//           document.body.removeChild(printIframe);
//         }, 100);
//       }, 500);
//     }
//   };

//   if (transcripts.length === 0) {
//     return (
//       <div className="bg-white rounded-lg shadow-sm border">
//         <div className="p-12 text-center">
//           <div className="text-6xl mb-4">📄</div>
//           <h3 className="text-lg font-medium text-gray-900 mb-2">No transcripts found</h3>
//           <p className="text-gray-500">Your transcripts will appear here once you upload audio files.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
//       {/* Search and filter controls */}
//       <div className="p-4 bg-gray-50 border-b">
//         <div className="flex flex-col md:flex-row gap-3">
//           <div className="flex-1 relative">
//             <input
//               type="text"
//               placeholder="Search..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               aria-label="Search transcripts"
//               onKeyDown={(e) => {
//                 if (e.key === 'Escape') {
//                   setSearchTerm('');
//                 }
//               }}
//             />
//             {searchTerm && (
//               <button 
//                 onClick={() => setSearchTerm('')}
//                 className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                 aria-label="Clear search"
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                   <line x1="18" y1="6" x2="6" y2="18"></line>
//                   <line x1="6" y1="6" x2="18" y2="18"></line>
//                 </svg>
//               </button>
//             )}
//           </div>
//           <div className="md:w-48">
//             <select
//               value={searchField}
//               onChange={(e) => setSearchField(e.target.value as any)}
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="all">All Fields</option>
//               <option value="patName">Patient Name</option>
//               <option value="patNum">Patient Number</option>
//               <option value="audioFilename">Audio Filename</option>
//             </select>
//           </div>
//         </div>
//         <div className="mt-2 text-sm text-gray-500">
//           {filteredTranscripts.length} {filteredTranscripts.length === 1 ? 'result' : 'results'} found
//           {searchTerm && (
//             <button 
//               onClick={() => {
//                 setSearchTerm('');
//                 setSearchField('all');
//               }}
//               className="ml-2 text-blue-500 hover:text-blue-700 hover:underline"
//             >
//               Clear filters
//             </button>
//           )}
//         </div>
//       </div>

//       <div className="overflow-x-auto">
//         {isSearching ? (
//           <div className="p-8 text-center">
//             <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-2"></div>
//             <p className="text-gray-600">Searching...</p>
//           </div>
//         ) : filteredTranscripts.length === 0 && searchTerm ? (
//           <div className="p-12 text-center">
//             <div className="text-4xl mb-4">🔍</div>
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
//             <p className="text-gray-500">Try adjusting your search or filter criteria</p>
//           </div>
//         ) : (
//         <table className="min-w-full divide-y divide-gray-200">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Number</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audio Filename</th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF Download</th>
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-200">
//             {paginatedTranscripts.map((t) => (
//               <tr key={t.transcription_id} className="hover:bg-gray-50 transition-colors">
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(t as any).pat_name || (t as any).patName || <span className="text-gray-400 italic">N/A</span>}</td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(t as any).pat_num || (t as any).patNum || <span className="text-gray-400 italic">N/A</span>}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.audio_filename || <span className="text-gray-400 italic">N/A</span>}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                   <div>{new Date(t.created_at).toLocaleDateString()}</div>
//                   <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString()}</div>
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(t.status)}</td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                   {t.status === 'completed' ? (
//                     <button
//                       className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
//                       onClick={() => handleDownload(t.transcription_id, t.original_filename)}
//                       disabled={downloadingId === t.transcription_id}
//                     >
//                       <span className="mr-1">📄</span>
//                       {downloadingId === t.transcription_id ? 'Downloading...' : 'Download PDF'}
//                     </button>
//                   ) : (
//                     <span className="text-gray-400 text-xs">Processing...</span>
//                   )}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         )}
//       </div>
//       {/* Pagination Controls */}
//       {filteredTranscripts.length > 0 && totalPages > 1 && (
//         <div className="flex justify-center items-center gap-2 py-4">
//           <button
//             className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"
//             onClick={() => setPage(page - 1)}
//             disabled={page === 1}
//           >
//             Previous
//           </button>
//           <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
//           <button
//             className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"
//             onClick={() => setPage(page + 1)}
//             disabled={page === totalPages}
//           >
//             Next
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// export default function TranscriptHistory({ 
//   transcripts, 
//   audios, 
//   workspaceId
// }: { 
//   transcripts: Transcript[]; 
//   audios: Audio[]; 
//   workspaceId: string;
// }) {
//   const [activeTab, setActiveTab] = useState<'transcripts' | 'audios'>('transcripts');

//   return (
//     <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
//       {/* Tab Navigation */}
//       <div className="border-b border-gray-200">
//         <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
//           <button
//             onClick={() => setActiveTab('transcripts')}
//             className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
//               activeTab === 'transcripts'
//                 ? 'border-indigo-500 text-indigo-600'
//                 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//             }`}
//           >
//             <div className="flex items-center">
//               <span className="mr-2">📄</span>
//               Scribe History
//               <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
//                 {transcripts.length}
//               </span>
//             </div>
//           </button>
         
//         </nav>
//       </div>

//       {/* Tab Content */}
//       <div className="p-6">
//         {activeTab === 'transcripts' && (
//           <div>
//             <div className="mb-4">
//               <h3 className="text-lg font-medium text-gray-900">Scribe History</h3>
//               <p className="text-sm text-gray-600">View and manage your transcription history</p>
//             </div>
//             <TranscriptsTable transcripts={transcripts} audios={audios} workspaceId={workspaceId} />
//           </div>
//         )}

      
//       </div>
//     </div>
//   );
// }





////////////////////////////////


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
    follow_up?:string[];
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

  // PDF download logic - fetch JSON from S3 and generate PDF
  const handleDownload = async (transcriptionId: string, filename: string) => {
    try {
      setDownloadingId(transcriptionId);
      
      // Use the full AWS API Gateway URL instead of relative path
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod';
      
      // Step 1: Get the signed S3 URL for the formatted JSON
      const res = await fetch(`${API_BASE_URL}/api/workspace/${workspaceId}/transcripts/${transcriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, // Add your auth token
          'Content-Type': 'application/json',
        }
      });
      
      if (!res.ok) throw new Error('Failed to get signed URL');
      
      const data = await res.json();
      
      // Step 2: Check if we have a download URL for the JSON
      if (data.download_url) {
        // Step 3: Fetch the JSON content from S3
        const jsonResponse = await fetch(data.download_url);
        
        if (!jsonResponse.ok) {
          throw new Error('Failed to fetch JSON from S3');
        }
        
        // Step 4: Parse the JSON content
        const jsonContent = await jsonResponse.json();
        
        // Step 5: Extract clinical data from the JSON
        // Check if it's already a formatted transcript with medical_summary
        const clinicalData: ClinicalData = jsonContent.medical_summary || jsonContent.clinical_data || jsonContent;
        
        // Step 6: Generate PDF from the clinical data
        if (clinicalData && (clinicalData.overall_summary || clinicalData.diagnosis)) {
          generatePDFFromClinicalData(clinicalData, filename);
        } else {
          throw new Error('No valid clinical data found in JSON');
        }
      } else {
        throw new Error('No download URL available');
      }
    } catch (e) {
      console.error('Download error:', e);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to download transcript. Please try again.';
      if (e instanceof Error) {
        if (e.message.includes('Failed to fetch JSON')) {
          errorMessage = 'Failed to download clinical data. The file may have expired.';
        } else if (e.message.includes('No valid clinical data')) {
          errorMessage = 'Clinical data is not available or malformed.';
        } else if (e.message.includes('Failed to get signed URL')) {
          errorMessage = 'Unable to access transcript. Please try again later.';
        }
      }
      
      alert(errorMessage);
    } finally {
      setDownloadingId(null);
    }
  };
  
  // Generate PDF from clinical data with custom format
  const generatePDFFromClinicalData = (clinicalData: ClinicalData, filename: string) => {
    // Create a hidden iframe to print from
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'absolute';
    printIframe.style.top = '-9999px';
    printIframe.style.left = '-9999px';
    document.body.appendChild(printIframe);
    
    // Format bullet points for your specific structure
    const formatBulletPoints = (items?: string[]) => {
      if (!items || items.length === 0) return '';
      return items.map(item => `- ${item}`).join('\n');
    };
    
    // Build the formatted content according to your specification
    let formattedContent = '';
    
    // Header
    formattedContent += '==================================================\n';
    formattedContent += 'MEDICAL CONVERSATION SUMMARY\n';
    formattedContent += '==================================================\n\n';
    
    // Overall Summary Category
    if (clinicalData.overall_summary) {
      formattedContent += 'Category: Overall Summary\n';
      formattedContent += 'Sub-Category: Summary\n';
      formattedContent += '------------------------------\n';
      formattedContent += `${clinicalData.overall_summary}\n\n`;
    }
    
    // Diagnosis Section
    if (clinicalData.diagnosis?.identified_issues || clinicalData.diagnosis?.clinical_findings) {
      formattedContent += 'Sub-Category: Diagnosis\n';
      formattedContent += '------------------------------\n';
      
      // Combine identified issues and clinical findings
      const allDiagnosisItems = [
        ...(clinicalData.diagnosis?.identified_issues || []),
        ...(clinicalData.diagnosis?.clinical_findings || [])
      ];
      
      formattedContent += formatBulletPoints(allDiagnosisItems);
      formattedContent += '\n';
    }
    
    // Treatment Plan Section
    if (clinicalData.treatment_plan?.procedures || 
        clinicalData.treatment_plan?.medications || 
        clinicalData.lifestyle_recommendations ||
        clinicalData.follow_up) {
      formattedContent += 'Sub-Category: Treatment Plan\n';
      formattedContent += '------------------------------\n';
      
      // Combine all treatment-related items
      const allTreatmentItems = [
        ...(clinicalData.treatment_plan?.procedures || []),
        ...(clinicalData.treatment_plan?.medications || []),
        ...(clinicalData.lifestyle_recommendations || []),
        ...(clinicalData.follow_up || [])
      ];
      
      formattedContent += formatBulletPoints(allTreatmentItems);
      formattedContent += '\n';
    }
    
    // Additional Notes Section
    if (clinicalData.additional_notes && clinicalData.additional_notes.length > 0) {
      formattedContent += 'Sub-Category: Additional Notes\n';
      formattedContent += '------------------------------\n';
      formattedContent += formatBulletPoints(clinicalData.additional_notes);
      formattedContent += '\n';
    }
    
    // Differential Diagnosis (if exists)
    if (clinicalData.differential_diagnosis && clinicalData.differential_diagnosis.length > 0) {
      formattedContent += 'Sub-Category: Differential Diagnosis\n';
      formattedContent += '------------------------------\n';
      formattedContent += formatBulletPoints(clinicalData.differential_diagnosis);
      formattedContent += '\n';
    }
    if (clinicalData.treatment_plan.follow_up && clinicalData.treatment_plan.follow_up.length > 0) {
      formattedContent += 'Sub-Category: Follow up\n';
      formattedContent += '------------------------------\n';
      formattedContent += formatBulletPoints(clinicalData.treatment_plan.follow_up);
      formattedContent += '\n';
    }
    
    // Footer with metadata
    formattedContent += '\n==================================================\n';
    formattedContent += 'DOCUMENT INFORMATION\n';
    formattedContent += '==================================================\n';
    formattedContent += `Status: ${clinicalData.status || 'Unknown'}\n`;
    formattedContent += `Processing Time: ${clinicalData.processing_time ? new Date(clinicalData.processing_time).toLocaleString() : 'Unknown'}\n`;
    // formattedContent += `Model Used: ${clinicalData.model_used || 'Unknown'}\n`;
    formattedContent += `Generated: ${new Date().toLocaleString()}\n`;
    
    // Build PDF content with styling
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Conversation Summary - ${filename}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            line-height: 1.6; 
            margin: 40px; 
            color: #333;
            white-space: pre-wrap;
            font-size: 12px;
          }
          .content {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          @media print {
            body { margin: 20px; }
            .content { 
              page-break-inside: avoid;
              orphans: 3;
              widows: 3;
            }
          }
        </style>
      </head>
      <body>
        <div class="content">${formattedContent}</div>
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
                      {downloadingId === t.transcription_id ? 'Generating PDF...' : 'Download PDF'}
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
              Scribe History
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
              <h3 className="text-lg font-medium text-gray-900">Scribe History</h3>
              <p className="text-sm text-gray-600">View and manage your transcription history</p>
            </div>
            <TranscriptsTable transcripts={transcripts} audios={audios} workspaceId={workspaceId} />
          </div>
        )}

      
      </div>
    </div>
  );
}