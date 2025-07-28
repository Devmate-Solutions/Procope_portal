import { cookies } from 'next/headers';
import { decodeToken, UserProfile } from '@/lib/auth';
import React from 'react';
import AuthenticatedLayout from '../components/AuthenticatedLayout';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaSearch, FaDownload } from 'react-icons/fa';

// Define the type for patient data
type Patient = {
  'First Name': string;
  'Last Name': string;
  'DOB': string;
  'Phone Number': string;
  'Treatment': string;
  'Post-treatment Notes': string;
  'Post-treatment Perscription': string;
  'Follow Up Appointment': string;
  'Call Status': string;
  'Post-Ops Follow Up Notes'?: string;
  'Date for Post-Op Follow up': string;
  'Post-Op Call Status': string;
};

// Status badge component with color coding
const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-gray-200 text-gray-800';
  
  switch(status.toLowerCase()) {
    case 'called':
      color = 'bg-green-100 text-green-800';
      break;
    case 'not-called':
      color = 'bg-yellow-100 text-yellow-800';
      break;
    default:
      color = 'bg-gray-200 text-gray-800';
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
};

async function getPatients(): Promise<{
  patients: Patient[];
  error?: string;
  isLoading: boolean;
}> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('auth_token');
    const token = tokenCookie?.value;
    if (!token) {
      return { patients: [], error: 'User not authenticated (no token)', isLoading: false };
    }
    const user = decodeToken(token) as UserProfile | null;
    if (!user) {
      return { patients: [], error: 'Invalid or expired token', isLoading: false };
    }

    // API endpoint from the Nomads test
    const apiEndpoint = 'https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/nomads/patients';
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'query'
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      // Return loading state for 403 errors
      if (response.status === 403) {
        return { 
          patients: [], 
          error: 'Authorization check in progress... Please wait.', 
          isLoading: true 
        };
      }
      // For other errors, show the specific error message
      return { 
        patients: [], 
        error: `API error: ${response.status}`, 
        isLoading: false 
      };
    }

    const data = await response.json();
    return {
      patients: data.data || [],
      isLoading: false
    };
  } catch (err: any) {
    return { 
      patients: [], 
      error: err.message || 'Failed to fetch data', 
      isLoading: false 
    };
  }
}

export default async function ClaimsArchivePage() {
  const { patients, error, isLoading } = await getPatients();

  // Get workspaceId from the decoded token for future use if needed
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('auth_token');
  let workspaceId = '';
  if (tokenCookie?.value) {
    const user = decodeToken(tokenCookie.value) as UserProfile | null;
    if (user) workspaceId = user.workspaceId;
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1F4280]">Patient Archive</h1>
                <p className="text-sm text-gray-600 mt-1">View and manage your patient records</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="default"
                  size="default"
                  className="bg-[#1F4280] text-white hover:bg-[#1F4280]/90"
                  disabled={isLoading}
                >
                  <FaDownload className="mr-2" />
                  Export Patient Data
                </Button>
              </div>
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

            {/* Patient Table */}
            {!isLoading && !error && (
              <>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <form>
                      <Input
                        type="text"
                        name="search"
                        placeholder="Search by name, treatment, or status..."
                        className="pl-10 pr-4 py-2 w-full"
                      />
                    </form>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Treatment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow Up</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post-Op Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {patients.map((patient, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">{patient['First Name']} {patient['Last Name']}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{patient.DOB}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{patient['Phone Number']}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{patient.Treatment}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={patient['Call Status']} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{patient['Follow Up Appointment']}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={patient['Post-Op Call Status']} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {patient['Post-treatment Notes']?.length > 30
                                ? `${patient['Post-treatment Notes'].substring(0, 30)}...`
                                : patient['Post-treatment Notes']}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {patients.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No patients found matching your search.</p>
                    </div>
                  )}

                  {/* Simple Pagination */}
                  <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">1</span> to <span className="font-medium">{patients.length}</span> of <span className="font-medium">{patients.length}</span> results
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600"
                        disabled={true}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600"
                        disabled={true}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 
