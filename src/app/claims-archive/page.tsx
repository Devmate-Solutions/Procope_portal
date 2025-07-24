'use client';

import React, { useState } from 'react';
import AuthenticatedLayout from '../components/AuthenticatedLayout';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaSearch, FaDownload } from 'react-icons/fa';

// Define the type for claim data
type ClaimRecord = {
  name: string;
  dob: string;
  claim_status: string;
  data_processed: string;
  procedure_code: string;
  amount: number;
  insurance_comments: string;
  date: string;
};

// Status badge component with color coding
const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-gray-200 text-gray-800';
  
  switch(status.toLowerCase()) {
    case 'approved':
      color = 'bg-green-100 text-green-800';
      break;
    case 'pending':
      color = 'bg-yellow-100 text-yellow-800';
      break;
    case 'rejected':
      color = 'bg-red-100 text-red-800';
      break;
    case 'in process':
      color = 'bg-blue-100 text-blue-800';
      break;
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
};

export default function ClaimsArchivePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock data for the table
  const mockClaims: ClaimRecord[] = [
    {
      name: "John Smith",
      dob: "05/12/1980",
      claim_status: "Approved",
      data_processed: "07/15/2023",
      procedure_code: "D2740",
      amount: 850.00,
      insurance_comments: "Claim processed successfully",
      date: "07/10/2023"
    },
    {
      name: "Sarah Johnson",
      dob: "09/23/1975",
      claim_status: "Pending",
      data_processed: "07/18/2023",
      procedure_code: "D2950",
      amount: 320.50,
      insurance_comments: "Waiting for additional information",
      date: "07/16/2023"
    },
   
  ];

  // Filter claims based on search term
  const filteredClaims = searchTerm 
    ? mockClaims.filter(claim => 
        claim.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.procedure_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.claim_status.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : mockClaims;

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1F4280]">Claims Archive</h1>
                <p className="text-sm text-gray-600 mt-1">View and manage your submitted claims</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="default"
                  size="default"
                  className="bg-[#1F4280] text-white hover:bg-[#1F4280]/90"
                  onClick={() => {}}
                  disabled={isLoading}
                >
                  <FaDownload className="mr-2" />
                  Export Claims
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, procedure code, or status..."
                  className="pl-10 pr-4 py-2 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Claims Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Processed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procedure Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance Comments</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClaims.map((claim, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{claim.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{claim.dob}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={claim.claim_status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{claim.data_processed}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{claim.procedure_code}</td>
                        <td className="px-6 py-4 whitespace-nowrap">${claim.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.insurance_comments.length > 30
                            ? `${claim.insurance_comments.substring(0, 30)}...`
                            : claim.insurance_comments}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{claim.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredClaims.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No claims found matching your search.</p>
                </div>
              )}

              {/* Simple Pagination */}
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredClaims.length}</span> of <span className="font-medium">{mockClaims.length}</span> results
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
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 
