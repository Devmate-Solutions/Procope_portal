'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { createCall, createBatchCalls, getAgents } from '@/lib/azure-api';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '../components/AuthenticatedLayout';

// Default values - will be updated from user data
const DEFAULT_FROM_NUMBER = '+16507478843'; // Your Retell phone number

interface CallFormData {
  fromNumber: string;
  toNumber: string;
  agentId: string;
  customerName: string;
  delayMinutes: number;
}

interface CsvRow {
  phoneNumber: string;
  customerName?: string;
  metadata?: Record<string, string>;
}

export default function CreateCallsPage() {
  const [user, setUser] = useState<any>(null);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const router = useRouter();

  const [formData, setFormData] = useState<CallFormData>({
    fromNumber: DEFAULT_FROM_NUMBER,
    toNumber: '',
    agentId: '',
    customerName: '',
    delayMinutes: 15
  });

  // Fetch agent names from phone numbers endpoint
  const fetchAgentNames = async () => {
    try {
      const phoneNumbersData = await getAgents();
      const nameMap: Record<string, string> = {};
      const availableAgentIds: string[] = [];

      if (Array.isArray(phoneNumbersData)) {
        setPhoneNumbers(phoneNumbersData);
        
        phoneNumbersData.forEach((phoneData: any) => {
          // Add inbound agent if exists
          if (phoneData.inbound_agent_id) {
            nameMap[phoneData.inbound_agent_id] = `InBound Agent (${phoneData.phone_number_pretty})`;
            availableAgentIds.push(phoneData.inbound_agent_id);
          }
          // Add outbound agent if exists
          if (phoneData.outbound_agent_id) {
            nameMap[phoneData.outbound_agent_id] = `Outbound Agent (${phoneData.phone_number_pretty})`;
            availableAgentIds.push(phoneData.outbound_agent_id);
          }
        });

        // Set default from number to the first available phone number
        if (phoneNumbersData.length > 0) {
          setFormData(prev => ({
            ...prev,
            fromNumber: phoneNumbersData[0].phone_number_pretty
          }));
        }

        // Set default agent to the first outbound agent if available, otherwise first available agent
        const outboundAgents = phoneNumbersData
          .filter(phoneData => phoneData.outbound_agent_id)
          .map(phoneData => phoneData.outbound_agent_id);
        
        const defaultAgentId = outboundAgents.length > 0 ? outboundAgents[0] : availableAgentIds[0];
        
        if (defaultAgentId) {
          setFormData(prev => ({
            ...prev,
            agentId: defaultAgentId
          }));
        }

        // Update user object to include all available agents
        if (user) {
          setUser((prev: any) => ({
            ...prev,
            agentIds: availableAgentIds
          }));
        }
      }

      setAgentNames(nameMap);
      console.log('📋 Agent names loaded:', nameMap);
      console.log('📞 Phone numbers loaded:', phoneNumbersData);
      console.log('🤖 Available agents:', availableAgentIds);
    } catch (error) {
      console.error('Failed to fetch agent names:', error);
    }
  };

  // Initialize user and set default agent
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    // Fetch agent names first, which will set the default agent
    fetchAgentNames();
  }, [router]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ call_id: string } | null>(null);
  
  // CSV related states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [showCsvTable, setShowCsvTable] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    processed: number;
    success: number;
    failed: number;
  }>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const formatPhoneNumber = (phoneNumber: string): string => {
    // Clean the phone number
    const cleaned = phoneNumber.trim().replace(/[^0-9+]/g, '');

    // If it already starts with +, return as is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // For numbers without +, add + prefix (don't assume country code)
    // User must provide the full international number including country code
    if (cleaned.length > 0) {
      return `+${cleaned}`;
    }

    return cleaned;
  };
  
  const parseCSV = (text: string): CsvRow[] => {
    // Split by new lines
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];
    
    // Determine the delimiter (comma or semicolon)
    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    // Parse header row if present
    const startIndex = hasHeaders ? 1 : 0;
    const headers = hasHeaders ? 
      lines[0].split(delimiter).map(h => h.trim().toLowerCase()) : 
      ['phone_number', 'customer_name'];
    
   
    // Find column indices
    const phoneNumberIndex = headers.findIndex(h => 
      h.includes('phone') || h.includes('number') || h.includes('tel'));
    const nameIndex = headers.findIndex(h => 
      h.includes('name') || h.includes('customer'));
    
    if (phoneNumberIndex === -1) {
      throw new Error('Could not identify phone number column in CSV');
    }
    
    // Parse rows
    const parsedRows: CsvRow[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const row = lines[i].split(delimiter).map(cell => cell.trim());
      
      // Skip empty rows
      if (row.every(cell => cell === '')) continue;
      
      // Extract phone number (required)
      const phoneNumber = row[phoneNumberIndex];
      if (!phoneNumber) continue;
      
      // Extract customer name if available
      const customerName = nameIndex !== -1 ? row[nameIndex] : undefined;
      
      // Extract any additional metadata from other columns
      const metadata: Record<string, string> = {};
      headers.forEach((header, index) => {
        // Skip phone number and name columns, add all others as metadata
        if (index !== phoneNumberIndex && index !== nameIndex && row[index]) {
          metadata[header] = row[index];
        }
      });
      
      parsedRows.push({
        phoneNumber,
        customerName,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      });
    }
    return parsedRows;
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setCsvFile(file);
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsedData = parseCSV(text);
          setCsvData(parsedData);
          setShowCsvTable(true);
          
          
        } catch (error: any) {
          
          setError(`Failed to parse CSV: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read file');
      };
      
      reader.readAsText(file);
    } catch (err: any) {
      
      setError(`Failed to process CSV file: ${err.message}`);
    }
  };
  
  const cancelCSVImport = () => {
    setShowCsvTable(false);
    setCsvFile(null);
    setCsvData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Function to create a single call
  const createSingleCall = async (
    toNumber: string, 
    customerName?: string, 
    metadata?: Record<string, string>
  ): Promise<string> => {
    // Format phone numbers
    const fromNumber = formatPhoneNumber(formData.fromNumber);
    const formattedToNumber = formatPhoneNumber(toNumber);
    
    // Prepare dynamic variables
    const dynamicVariables: Record<string, any> = {};
    
    // Add customer name if provided
    if (customerName) {
      dynamicVariables.customer_name = customerName;
    }
    
    // Add all metadata as dynamic variables
    if (metadata && Object.keys(metadata).length > 0) {

      Object.entries(metadata).forEach(([key, value]) => {
        // Convert keys to snake_case for the API
        const snakeCaseKey = key.replace(/\s+/g, '_').toLowerCase();
        dynamicVariables[snakeCaseKey] = value;
      });
    }
    
    // Prepare payload for Azure API
    const payload = {
      from_number: fromNumber,
      to_number: formattedToNumber,
      agent_id: formData.agentId,
      override_agent_version: 1,
      metadata: {},
      // Only add retell_llm_dynamic_variables if we have variables to add
      ...(Object.keys(dynamicVariables).length > 0 ? {
        retell_llm_dynamic_variables: dynamicVariables
      } : {})
    };

    console.log('Creating call with payload:', payload);

    // Use Azure API
    const data = await createCall(payload);
    return data.call_id;
  };
  
 
  // Process CSV batch with delays between calls
  const processCsvBatch = async () => {
    if (csvData.length === 0) {
      setError('No data to process');
      return;
    }

    setProcessingBatch(true);
    setError(null);

    try {
      // Map csvData to the required call_patients format
      const call_patients = csvData.map(row => ({
        call_status: "not-called",
        date_for_post_op_follow_up: row.metadata?.date_for_post_op_follow_up || "",
        created_at: new Date().toISOString(),
        date_of_birth: row.metadata?.date_of_birth || "",
        follow_up_appointment: row.metadata?.follow_up_appointment || "",
        post_treatment_notes: row.metadata?.post_treatment_notes || "",
        updated_at: new Date().toISOString(),
        last_name: row.metadata?.last_name || "",
        treatment: row.metadata?.treatment || "",
        first_name: row.metadata?.first_name || "",
        post_ops_follow_up_notes: row.metadata?.post_ops_follow_up_notes || "",
        phone_number: row.phoneNumber || "",
        post_op_call_status: row.metadata?.post_op_call_status || "not-called",
        post_treatment_prescription: row.metadata?.post_treatment_prescription || "",
        patient_id: row.metadata?.patient_id || "",
      }));

      // Send the batch to your webhook as { call_patients: [...] }
      const response = await fetch(
        "https://n8n-app.eastus.cloudapp.azure.com:5678/webhook/64602fde-f5b2-4baf-b9a8-91d641ffe69c",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ call_patients }),
        }
      );

      // Log the raw response for debugging
      const respText = await response.text();
      console.log("Batch API raw response:", respText);

      if (!response.ok) {
        throw new Error("Batch call API failed");
      }

      setSuccess({ call_id: "Batch submitted" });
      setShowCsvTable(false);
      setCsvFile(null);
      setCsvData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      setError(`Batch call failed: ${error.message}`);
    } finally {
      setProcessingBatch(false);
    }
  };

  

  // Get only outbound agent IDs from phone numbers data
  const getOutboundAgentIds = () => {
    const agentIds: string[] = [];
    phoneNumbers.forEach((phoneData: any) => {
      if (phoneData.outbound_agent_id) {
        agentIds.push(phoneData.outbound_agent_id);
      }
    });
    return agentIds;
  };
  
  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header with Logo */}
     

        <div className="p-8">
          <h1 className="text-2xl font-bold text-primary mb-6">Create Outbound Calls</h1>
          
          
          <div className="bg-white rounded-lg shadow-md p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                <p className="font-semibold">Error</p>
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
                <p className="font-semibold">Call Created Successfully!</p>
                <p>Call ID: {success.call_id}</p>
                <p className="text-sm mt-2">You can track this call in the Call History page.</p>
              </div>
            )}
            
            {processingBatch && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                <p className="font-semibold mb-2">Processing Batch Calls</p>
                <div className="mb-2">
                  <p>Progress: {batchProgress.processed} of {batchProgress.total} calls processed</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(batchProgress.processed / batchProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <p>Success: {batchProgress.success} calls</p>
                <p>Failed: {batchProgress.failed} calls</p>
                <p className="text-sm mt-2">Please do not close this page. Each call is being made with a {formData.delayMinutes} minute delay.</p>
              </div>
            )}
            <div className="mb-6 border-b border-gray-200">
              <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                <li className="mr-2">
                  <button
                    className={`inline-block p-4 rounded-t-lg ${!showCsvTable ? 'border-b-2 border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setShowCsvTable(false)}
                    disabled={processingBatch}
                  >
                    Archive
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    className={`inline-block p-4 rounded-t-lg ${showCsvTable ? 'border-b-2 border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setShowCsvTable(true)}
                    disabled={processingBatch}
                  >
                    Batch Upload (CSV)
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Archive Table Section */}
            {!showCsvTable && !processingBatch && (
              <div className="space-y-6">
                <div className="overflow-x-auto shadow-md rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Treatment</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post-treatment Notes</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post-treatment Prescription</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow Up Appointment</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call Status</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post-Ops Follow Up Notes</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date for Post-Op Follow up</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post-Op Call Status</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Sample data - replace with actual data from your API */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900">John</a>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900">Doe</a>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">1980-05-15</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">+12345678901</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">Dental Implant</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">Patient recovering well</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">Amoxicillin 500mg</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">2023-06-15</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">No complications reported</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">2023-06-22</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Scheduled
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <button className="text-indigo-600 hover:text-indigo-900 mr-2">
                            Call
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            Edit
                          </button>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900">Jane</a>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900">Smith</a>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">1975-10-20</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">+19876543210</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">Root Canal</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">Mild discomfort reported</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">Ibuprofen 600mg</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">2023-07-05</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Failed
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">--</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">2023-07-12</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not Started
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <button className="text-indigo-600 hover:text-indigo-900 mr-2">
                            Call
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            Edit
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination controls */}
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Previous
                    </button>
                    <button className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">1</span> to <span className="font-medium">2</span> of{' '}
                        <span className="font-medium">2</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                          <span className="sr-only">Previous</span>
                          &lt;
                        </button>
                        <button className="relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                          1
                        </button>
                        <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                          <span className="sr-only">Next</span>
                          &gt;
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* CSV Upload Section */}
            {showCsvTable && !processingBatch && (
              <div className="space-y-6">
                {/* CSV Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload CSV File
                  </label>
                  <div className="flex items-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-medium
                           file:bg-blue-50 file:text-blue-700
                           hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md text-sm text-yellow-800">
                    <p className="font-medium">CSV Format Requirements:</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li>Must include a column containing phone numbers (in any format)</li>
                      <li>Optional: Include a column with customer names</li>
                      <li>Any other columns will be passed as metadata to the agent</li>
                    </ul>
                  </div>
                  
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="hasHeaders"
                      checked={hasHeaders}
                      onChange={(e) => setHasHeaders(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="hasHeaders" className="text-sm text-gray-700">
                      First row contains headers
                    </label>
                  </div>
                </div>
                
                {/* CSV Data Preview */}
                {csvData.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-md font-medium mb-2">Preview ({csvData.length} contacts)</h3>
                    <div className="overflow-auto max-h-80 border border-gray-200 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phone Number
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Customer Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Metadata Fields
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {csvData.slice(0, 5).map((row, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {row.phoneNumber}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {row.customerName || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {row.metadata ? (
                                  <div className="space-y-1">
                                    {Object.entries(row.metadata).map(([key, value], i) => (
                                      <div key={i} className="flex">
                                        <span className="font-medium mr-2">{key}:</span>
                                        <span>{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  'No additional fields'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 5 && (
                        <div className="text-center p-2 text-sm text-gray-500 border-t">
                          {csvData.length - 5} more records not shown
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end mt-4 space-x-3">
                      <button
                        type="button"
                        onClick={cancelCSVImport}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={processCsvBatch}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Process {csvData.length} Calls
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
