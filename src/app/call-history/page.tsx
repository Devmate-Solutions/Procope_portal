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
import { FaChevronLeft, FaChevronRight, FaCalendarAlt } from 'react-icons/fa';
import { getCalls, getAgents } from '@/lib/azure-api';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '../components/AuthenticatedLayout';

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

  // State for week-based pagination
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, 1 = last week, etc.
  const [weekDateRange, setWeekDateRange] = useState<{start: Date, end: Date} | null>(null);

  // State for data fetching
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Add state for user information
  const [user, setUser] = useState<any | null>(null);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const router = useRouter();

  // Fetch agent names from phone numbers endpoint
  const fetchAgentNames = async () => {
    try {
      const phoneNumbers = await getAgents();
      const nameMap: Record<string, string> = {};

      if (Array.isArray(phoneNumbers)) {
        phoneNumbers.forEach((phoneData: any) => {
          // Add inbound agent if exists
          if (phoneData.inbound_agent_id) {
            nameMap[phoneData.inbound_agent_id] = `InBound Agent (${phoneData.phone_number_pretty})`;
          }
          // Add outbound agent if exists
          if (phoneData.outbound_agent_id) {
            nameMap[phoneData.outbound_agent_id] = `Outbound Agent (${phoneData.phone_number_pretty})`;
          }
        });
      }

      setAgentNames(nameMap);
      console.log('📋 Agent names loaded:', nameMap);
    } catch (error) {
      console.error('Failed to fetch agent names:', error);
    }
  };

  // Helper function to get week date range
  const getWeekDateRange = (weekOffset: number) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1; // Make Monday the start of week

    // Calculate start of current week (Monday)
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - daysToSubtract);
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    // Calculate start and end of the target week
    const startOfWeek = new Date(startOfCurrentWeek);
    startOfWeek.setDate(startOfCurrentWeek.getDate() - (weekOffset * 7));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
  };

  // Initialize user and week range
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    // Set initial week range
    const initialWeekRange = getWeekDateRange(currentWeekOffset);
    setWeekDateRange(initialWeekRange);

    // Fetch agent names
    fetchAgentNames();
  }, [router]);

  // Update week range when offset changes
  useEffect(() => {
    const newWeekRange = getWeekDateRange(currentWeekOffset);
    setWeekDateRange(newWeekRange);
  }, [currentWeekOffset]);
  
  // Fetch call history data
  const fetchData = async () => {
    if (!user || !weekDateRange) return;

    setIsLoading(true);
    try {
      // Build filters for Azure API - will automatically filter by user's accessible agents
      const filters: any = {
        limit: 1000,
        sort_order: 'descending',
        // Add date range filters for the current week
        start_timestamp_after: weekDateRange.start.getTime().toString(),
        start_timestamp_before: weekDateRange.end.getTime().toString()
      };

      console.log('📅 Fetching calls for week:', {
        start: weekDateRange.start.toLocaleDateString(),
        end: weekDateRange.end.toLocaleDateString(),
        weekOffset: currentWeekOffset
      });

      const data = await getCalls(filters);
      console.log('📦 Call history response:', data);

      // Handle different response formats from backend
      let callsArray = [];
      if (Array.isArray(data)) {
        callsArray = data;
      } else if (data.calls && Array.isArray(data.calls)) {
        callsArray = data.calls;
      } else if (data.data && Array.isArray(data.data)) {
        callsArray = data.data;
      }

      console.log('📞 Processed calls array:', callsArray.length, 'calls');
      setCalls(callsArray);
      setError(null);
    } catch (err: any) {
      console.error('Call history fetch error:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (user && weekDateRange) {
      fetchData();
    }
  }, [user, weekDateRange]);
  
  // Refetch function
  const refetch = () => {
    fetchData();
  };

  // Week navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page
  };

  const goToNextWeek = () => {
    if (currentWeekOffset > 0) {
      setCurrentWeekOffset(prev => prev - 1);
      setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page
    }
  };

  const goToCurrentWeek = () => {
    setCurrentWeekOffset(0);
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page
  };

  // Helper function to format week range for display
  const getWeekDisplayText = () => {
    if (!weekDateRange) return '';

    const startDate = weekDateRange.start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: weekDateRange.start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    const endDate = weekDateRange.end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: weekDateRange.end.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });

    if (currentWeekOffset === 0) {
      return `This Week (${startDate} - ${endDate})`;
    } else if (currentWeekOffset === 1) {
      return `Last Week (${startDate} - ${endDate})`;
    } else {
      return `${currentWeekOffset} Weeks Ago (${startDate} - ${endDate})`;
    }
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
    columnHelper.accessor('agent_id', {
      header: 'Agent',
      cell: info => {
        const agentId = info.getValue();
        const agentName = agentNames[agentId];

        if (agentName) {
          if (agentName.toLowerCase().includes('inbound')) {
            return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Inbound</span>;
          } else if (agentName.toLowerCase().includes('outbound')) {
            return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Outbound</span>;
          } else {
            return <span className="text-xs">{agentName.length > 20 ? agentName.substring(0, 20) + "..." : agentName}</span>;
          }
        }

        return <span className="text-xs font-mono">{agentId.substring(0, 12)}...</span>;
      },
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
    return user?.workspaceName || 'Your Workspace';
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header with Logo */}
       
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">Call History</h1>
              <p className="text-sm text-gray-600 mt-1">{getWeekDisplayText()}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <FaCalendarAlt className="text-gray-500" />
              <span className="font-medium text-gray-700">Week Navigation:</span>
              <span className="text-sm text-gray-600">{getWeekDisplayText()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousWeek}
                className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                <FaChevronLeft className="mr-1" />
                Previous Week
              </button>

              {currentWeekOffset > 0 && (
                <button
                  onClick={goToCurrentWeek}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={isLoading}
                >
                  Current Week
                </button>
              )}

              <button
                onClick={goToNextWeek}
                disabled={currentWeekOffset === 0 || isLoading}
                className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                  currentWeekOffset === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Next Week
                <FaChevronRight className="ml-1" />
              </button>
            </div>
          </div>
          
          {/* Display workspace info */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">Workspace:</strong>
            <span className="block sm:inline"> {getAgentName()} - {user?.agentIds?.length || 0} agent(s) accessible</span>
          </div>

          {/* Week Summary */}
          {!isLoading && calls.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Calls</div>
                <div className="text-2xl font-bold text-gray-900">{calls.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Successful Calls</div>
                <div className="text-2xl font-bold text-green-600">
                  {calls.filter(call => call.call_status === 'completed').length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Failed Calls</div>
                <div className="text-2xl font-bold text-red-600">
                  {calls.filter(call => call.call_status === 'failed' || call.call_status === 'error').length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Average Duration</div>
                <div className="text-2xl font-bold text-blue-600">
                  {calls.length > 0
                    ? Math.round(calls.reduce((sum, call) => sum + (call.duration_ms || 0), 0) / calls.length / 1000)
                    : 0}s
                </div>
              </div>
            </div>
          )}

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
    </AuthenticatedLayout>
  );
};

export default CallHistoryPage;
