'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { 
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
  PaginationState,
} from '@tanstack/react-table';
import { getCallHistory, getAgentById } from '../api/retell';

// Orasurge Outbound V2 agent ID
const AGENT_ID = 'agent_a3f5d1a7dd6d0abe1ded29a1fc';
const API_KEY = process.env.NEXT_PUBLIC_RETELL_API_KEY || '';

// Define the type for call data
type CallRecord = {
  call_id: string;
  call_type: string;
  agent_id: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  call_status: string;
  disconnection_reason?: string;
  direction?: string;
  transcript?: string;
  recording_url?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
  };
};

// Column helper for the call history table
const columnHelper = createColumnHelper<CallRecord>();

// Format timestamp to readable date string
const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
};

// Format duration from milliseconds to readable format
const formatDuration = (durationMs?: number) => {
  if (!durationMs) return 'N/A';
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}m ${remainingSeconds}s`;
};

// Status badge component with color coding
const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-gray-200 text-gray-800';
  
  switch(status.toLowerCase()) {
    case 'completed':
      color = 'bg-green-100 text-green-800';
      break;
    case 'in_progress':
      color = 'bg-blue-100 text-blue-800';
      break;
    case 'failed':
      color = 'bg-red-100 text-red-800';
      break;
    case 'registered':
      color = 'bg-yellow-100 text-yellow-800';
      break;
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
};

// Success badge component for call_successful
const SuccessBadge = ({ successful }: { successful?: boolean }) => {
  if (successful === undefined) return <span>Unknown</span>;
  
  const color = successful 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {successful ? 'Yes' : 'No'}
    </span>
  );
};

const CallHistoryPage = () => {
  // State for table sorting
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'start_timestamp', desc: true }
  ]);
  
  // State for table pagination
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // State for data fetching
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Add state for agent information
  const [agent, setAgent] = useState<any | null>(null);
  
  // Fetch agent details
  useEffect(() => {
    const fetchAgentDetails = async () => {
      try {
        const agentDetails = await getAgentById(API_KEY, AGENT_ID);
        setAgent(agentDetails);
      } catch (error) {
     
      }
    };
    
    fetchAgentDetails();
  }, []);
  
  // Fetch call history data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Always filter by our target agent ID
      const filters: any = { 
        agent_id: AGENT_ID 
      };
      
      const data = await getCallHistory(API_KEY, filters);
      
      // Additional client-side filtering to ensure we only show data for this agent
      const filteredData = data.filter(call => call.agent_id === AGENT_ID);
      
    
      setCalls(filteredData);
      setError(null);
    } catch (err: any) {
     
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);
  
  // Refetch function
  const refetch = () => {
    fetchData();
  };
  
  // Define table columns
  const columns = useMemo(() => [
    columnHelper.accessor('call_id', {
      header: 'Call ID',
      cell: info => <div className="font-mono text-xs">{info.getValue()}</div>,
    }),
    columnHelper.accessor('call_type', {
      header: 'Type',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('start_timestamp', {
      header: 'Start Time',
      cell: info => formatTimestamp(info.getValue()),
      sortingFn: 'datetime',
    }),
    columnHelper.accessor('duration_ms', {
      header: 'Duration',
      cell: info => formatDuration(info.getValue()),
    }),
    columnHelper.accessor('call_status', {
      header: 'Status',
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('disconnection_reason', {
      header: 'Disconnection',
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('direction', {
      header: 'Direction',
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor(row => row.call_analysis?.call_successful, {
      id: 'successful',
      header: 'Successful',
      cell: info => <SuccessBadge successful={info.getValue()} />,
    }),
    columnHelper.accessor(row => row.call_analysis?.user_sentiment, {
      id: 'sentiment',
      header: 'Sentiment',
      cell: info => info.getValue() || 'N/A',
    }),
  ], []);

  // Create the table instance
  const table = useReactTable({
    data: calls,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
  });

  // Render call details modal when a row is clicked
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  
  // Format agent name for display
  const getAgentName = () => {
    return agent?.name || 'Orasurge Outbound V2';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header with Logo */}
       
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">Call History</h1>
              
            </div>
            <button 
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
          
          {/* Display an info alert that we're only showing data for this agent */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">Note:</strong>
            <span className="block sm:inline"> Only showing call history for agent {getAgentName()}.</span>
          </div>
          
          {error ? (
            <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
              {error instanceof Error ? error.message : 'Failed to load call history'}
            </div>
          ) : null}
          
          <div className="bg-white rounded-lg shadow-md p-4 overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-2 text-gray-600">Loading call history...</p>
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-4">No call records found</h2>
                <p className="text-gray-600 mb-6">
                  There are no call records available for this agent yet.
                </p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th 
                            key={header.id}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.isPlaceholder
                              ? null
                              : (
                                <div className="flex items-center">
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {{
                                    asc: ' 🔼',
                                    desc: ' 🔽',
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              )}
                          </th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    ))}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.getRowModel().rows.map(row => (
                      <tr 
                        key={row.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedCall(row.original)}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            className="text-blue-600 hover:text-blue-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCall(row.original);
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination Controls */}
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${!table.getCanPreviousPage() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${!table.getCanNextPage() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(
                            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                            calls.length
                          )}
                        </span>{' '}
                        of <span className="font-medium">{calls.length}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => table.setPageIndex(0)}
                          disabled={!table.getCanPreviousPage()}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${!table.getCanPreviousPage() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                          <span className="sr-only">First</span>
                          ⟪
                        </button>
                        <button
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 ${!table.getCanPreviousPage() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                          <span className="sr-only">Previous</span>
                          ←
                        </button>
                        
                        {/* Page numbers */}
                        {Array.from(
                          { length: table.getPageCount() },
                          (_, i) => i
                        ).map((pageIndex) => {
                          // Show only 5 page numbers centered around current page
                          const currentPageIndex = table.getState().pagination.pageIndex;
                          const totalPages = table.getPageCount();
                          
                          // Always show first, last, current, and 1 on each side of current
                          if (
                            pageIndex === 0 || 
                            pageIndex === totalPages - 1 ||
                            Math.abs(pageIndex - currentPageIndex) <= 1
                          ) {
                            return (
                              <button
                                key={pageIndex}
                                onClick={() => table.setPageIndex(pageIndex)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pageIndex === currentPageIndex
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageIndex + 1}
                              </button>
                            );
                          }
                          
                          // Show ellipsis
                          if (
                            (pageIndex === 1 && currentPageIndex > 2) ||
                            (pageIndex === totalPages - 2 && currentPageIndex < totalPages - 3)
                          ) {
                            return (
                              <span
                                key={pageIndex}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                              >
                                ...
                              </span>
                            );
                          }
                          
                          return null;
                        })}
                        
                        <button
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 ${!table.getCanNextPage() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                          <span className="sr-only">Next</span>
                          →
                        </button>
                        <button
                          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                          disabled={!table.getCanNextPage()}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${!table.getCanNextPage() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                          <span className="sr-only">Last</span>
                          ⟫
                        </button>
                      </nav>
                    </div>
                  </div>
                  
                  {/* Page size selector */}
                  <div className="mt-2 flex items-center">
                    <span className="mr-2 text-sm text-gray-700">Rows per page:</span>
                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={e => {
                        table.setPageSize(Number(e.target.value));
                      }}
                      className="border border-gray-300 rounded-md text-sm p-1"
                    >
                      {[5, 10, 20, 50].map(pageSize => (
                        <option key={pageSize} value={pageSize}>
                          {pageSize}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Call Details Modal */}
          {selectedCall && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Call Details</h2>
                    <button 
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => setSelectedCall(null)}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Call ID</p>
                      <p className="font-mono">{selectedCall.call_id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <StatusBadge status={selectedCall.call_status} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p>{selectedCall.call_type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Direction</p>
                      <p>{selectedCall.direction || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Agent</p>
                      <p>{getAgentName()}</p>
                    </div>
                   
                    <div>
                      <p className="text-sm font-medium text-gray-500">Start Time</p>
                      <p>{formatTimestamp(selectedCall.start_timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">End Time</p>
                      <p>{formatTimestamp(selectedCall.end_timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Duration</p>
                      <p>{formatDuration(selectedCall.duration_ms)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Disconnection Reason</p>
                      <p>{selectedCall.disconnection_reason || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Call Analysis Section */}
                  {selectedCall.call_analysis && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">Call Analysis</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Successful</p>
                          <SuccessBadge successful={selectedCall.call_analysis.call_successful} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Sentiment</p>
                          <p>{selectedCall.call_analysis.user_sentiment || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {selectedCall.call_analysis.call_summary && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Summary</p>
                          <p className="bg-gray-50 p-3 rounded-md">
                            {selectedCall.call_analysis.call_summary}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Transcript Section */}
                  {selectedCall.transcript && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">Transcript</h3>
                      <div className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap font-mono text-sm">
                        {selectedCall.transcript}
                      </div>
                    </div>
                  )}
                  
                  {/* Recording URL */}
                  {selectedCall.recording_url && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Recording</h3>
                      <audio 
                        controls 
                        className="w-full"
                        src={selectedCall.recording_url}
                      />
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 px-6 py-3 flex justify-end">
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    onClick={() => setSelectedCall(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallHistoryPage; 