"use client"

import React, { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '../components/AuthenticatedLayout';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FaSearch, FaDownload, FaSync } from 'react-icons/fa';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Define the type for claim data based on your API response
type Claim = {
  id: number;
  patient_name: string;
  patnum: number;
  dob: string;
  service_date: string;
  amount: string;
  processed_date: string;
};

// Status badge component with color coding
const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-gray-200 text-gray-800';
  
  switch(status.toLowerCase()) {
    case 'processed':
      color = 'bg-green-100 text-green-800';
      break;
    case 'pending':
      color = 'bg-yellow-100 text-yellow-800';
      break;
    case 'failed':
      color = 'bg-red-100 text-red-800';
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

export default function ClaimsArchivePage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showStatus = (message: string, type: "success" | "error" | "info") => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 5000);
  };

  const loadClaims = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://mydent.duckdns.org:5000/claims');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch claims: ${response.status}`);
      }
      
      const data = await response.json();
      setClaims(data);
      setFilteredClaims(data);
      showStatus(`Successfully loaded ${data.length} claims`, "success");
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch claims';
      setError(errorMessage);
      showStatus(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load claims on component mount
  useEffect(() => {
    loadClaims();
  }, []);

  // Filter claims based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClaims(claims);
    } else {
      const filtered = claims.filter(claim =>
        claim.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.dob.includes(searchTerm) ||
        claim.service_date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.amount.includes(searchTerm) ||
        claim.patnum.toString().includes(searchTerm)
      );
      setFilteredClaims(filtered);
    }
  }, [searchTerm, claims]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const exportClaims = () => {
    if (filteredClaims.length === 0) {
      showStatus("No claims to export", "error");
      return;
    }

    const csvContent = [
      // CSV Header
      ['ID', 'Patient Name', 'Patient Number', 'Date of Birth', 'Service Date', 'Amount', 'Processed Date'].join(','),
      // CSV Data
      ...filteredClaims.map(claim => [
        claim.id,
        `"${claim.patient_name}"`,
        claim.patnum,
        claim.dob,
        `"${claim.service_date}"`,
        claim.amount,
        `"${claim.processed_date}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claims-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus("Claims exported successfully!", "success");
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1F4280]">Claims Archive</h1>
                <p className="text-sm text-gray-600 mt-1">View and manage processed claims</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline"
                  size="default"
                  onClick={loadClaims}
                  disabled={isLoading}
                  className="border-[#1F4280] text-[#1F4280] hover:bg-[#1F4280] hover:text-white"
                >
                  <FaSync className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  variant="default"
                  size="default"
                  className="bg-[#1F4280] text-white hover:bg-[#1F4280]/90"
                  onClick={exportClaims}
                  disabled={isLoading || filteredClaims.length === 0}
                >
                  <FaDownload className="mr-2" />
                  Export Claims
                </Button>
              </div>
            </div>

            {/* Status Messages */}
            {status && (
              <Alert
                className={`mb-6 ${
                  status.type === "error"
                    ? "border-red-500 bg-red-50"
                    : status.type === "success"
                      ? "border-green-500 bg-green-50"
                      : "border-blue-500 bg-blue-50"
                }`}
              >
                {status.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : status.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Loading Claims</h3>
                    <div className="mt-2 text-sm text-blue-700">Please wait while we fetch the latest claims data...</div>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error Loading Claims</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                    <div className="mt-3">
                      <Button 
                        onClick={loadClaims}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Claims Table */}
            {!isLoading && !error && (
              <>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by patient name, date, amount, or patient number..."
                      className="pl-10 pr-4 py-2 w-full"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                  {searchTerm && (
                    <p className="text-sm text-gray-600 mt-2">
                      Showing {filteredClaims.length} of {claims.length} claims
                    </p>
                  )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClaims.map((claim) => (
                          <tr key={claim.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{claim.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {claim.patient_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {claim.patnum}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {claim.dob}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {claim.service_date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                              ${claim.amount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(claim.processed_date).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredClaims.length === 0 && !isLoading && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {searchTerm ? 'No claims found matching your search.' : 'No claims found.'}
                      </p>
                      {searchTerm && (
                        <Button 
                          onClick={() => setSearchTerm('')}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          Clear Search
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Simple Pagination Info */}
                  {filteredClaims.length > 0 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{filteredClaims.length}</span> claims
                          {searchTerm && (
                            <span> (filtered from <span className="font-medium">{claims.length}</span> total)</span>
                          )}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        Last updated: {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
