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
  
  // Handle single call submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const callId = await createSingleCall(
        formData.toNumber, 
        formData.customerName || undefined
      );
      
      
      setSuccess({ call_id: callId });
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        toNumber: '',
        customerName: ''
      }));
      
    } catch (err: any) {

      setError(err.message || 'Failed to create call. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Process CSV batch with delays between calls
  const processCsvBatch = async () => {
    if (csvData.length === 0) {
      setError('No data to process');
      return;
    }
    
    setProcessingBatch(true);
    setError(null);
    setBatchProgress({
      total: csvData.length,
      processed: 0,
      success: 0,
      failed: 0
    });
    
    // Process each row with delay
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
       
        
        
        // Create the call
        await createSingleCall(
          row.phoneNumber, 
          row.customerName, 
          row.metadata
        );
        
        // Update progress
        setBatchProgress(prev => ({
          ...prev,
          processed: prev.processed + 1,
          success: prev.success + 1
        }));
        
        // Wait for the specified delay before next call (except for the last item)
        if (i < csvData.length - 1) {
          const delayMs = formData.delayMinutes * 60 * 1000;
         
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
       
        
        
        // Update progress
        setBatchProgress(prev => ({
          ...prev,
          processed: prev.processed + 1,
          failed: prev.failed + 1
        }));
        
        // Continue with next item after delay
        if (i < csvData.length - 1) {
          const delayMs = formData.delayMinutes * 60 * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    setProcessingBatch(false);
    setShowCsvTable(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get available agent IDs from phone numbers data
  const getAvailableAgentIds = () => {
    const agentIds: string[] = [];
    phoneNumbers.forEach((phoneData: any) => {
      if (phoneData.inbound_agent_id) {
        agentIds.push(phoneData.inbound_agent_id);
      }
      if (phoneData.outbound_agent_id) {
        agentIds.push(phoneData.outbound_agent_id);
      }
    });
    return agentIds;
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
            
            {/* Tabs for single call vs CSV upload */}
            <div className="mb-6 border-b border-gray-200">
              <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                <li className="mr-2">
                  <button
                    className={`inline-block p-4 rounded-t-lg ${!showCsvTable ? 'border-b-2 border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setShowCsvTable(false)}
                    disabled={processingBatch}
                  >
                    Single Call
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
            
            {/* Single Call Form */}
            {!showCsvTable && !processingBatch && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* From Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fromNumber"
                      value={formData.fromNumber}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="+1234567890 (include country code)"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be a number you own in Retell (E.164 format)
                    </p>
                  </div>
                  
                  {/* To Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="toNumber"
                      value={formData.toNumber}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="+44123456789 (include country code)"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The recipient's phone number with country code (E.164 format). Examples: +1234567890 (US)
                    </p>
                  </div>
                </div>
                
                {/* Agent Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent <span className="text-red-500">*</span>
                  </label>
                  {getAvailableAgentIds().length > 1 ? (
                    <select
                      name="agentId"
                      value={formData.agentId}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      {getAvailableAgentIds().map((agentId: string) => {
                        const agentName = agentNames[agentId];
                        let displayName = agentId;

                        if (agentName) {
                          if (agentName.toLowerCase().includes('inbound')) {
                            displayName = "InBound Agent";
                          } else if (agentName.toLowerCase().includes('outbound')) {
                            displayName = "Outbound Agent";
                          } else {
                            displayName = agentName.length > 30 ? agentName.substring(0, 30) + "..." : agentName;
                          }
                        }

                        return (
                          <option key={agentId} value={agentId}>
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="agentId"
                      value={formData.agentId}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                      required
                      readOnly
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Workspace: {user?.workspaceName} - {getAvailableAgentIds().length || 0} agent(s) available
                  </p>
                </div>
                
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="John Doe"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will be passed to the agent as a dynamic variable
                  </p>
                </div>
                
                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2 rounded-md text-white font-medium 
                      ${loading ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}
                  >
                    {loading ? 'Creating Call...' : 'Create Call'}
                  </button>
                </div>
              </form>
            )}
            
            {/* CSV Upload Section */}
            {showCsvTable && !processingBatch && (
              <div className="space-y-6">
                {/* From Number and Agent ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fromNumber"
                      value={formData.fromNumber}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="+1234567890 (include country code)"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be a number you own in Retell with country code (E.164 format)
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent Outbound <span className="text-red-500">*</span>
                    </label>
                    {getOutboundAgentIds().length > 1 ? (
                      <select
                        name="agentId"
                        value={formData.agentId}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      >
                        {getOutboundAgentIds().map((agentId: string) => {
                          const agentName = agentNames[agentId];
                          let displayName = "Outbound Agent";

                          if (agentName && agentName.toLowerCase().includes('outbound')) {
                            displayName = "Outbound Agent";
                          }

                          return (
                            <option key={agentId} value={agentId}>
                              {displayName}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="agentId"
                        value={formData.agentId}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                        required
                        readOnly
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Outbound agents only for batch calls
                    </p>
                  </div>
                </div>
                
                {/* Delay Between Calls */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay Between Calls (minutes) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="delayMinutes"
                    value={formData.delayMinutes}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="1">1 minute</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Time to wait between each call to avoid rate limiting
                  </p>
                </div>
                
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
