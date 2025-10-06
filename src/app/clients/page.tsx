'use client';

import { useState, useEffect } from 'react';
import { clientAPI, type Client, type ClientApiResponse } from '@/lib/aws-api';
import AddClientModal from '@/components/AddClientModal';
import { AuthenticatedLayout } from '@/app/components/AuthenticatedLayout';


export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showCallSummaryModal, setShowCallSummaryModal] = useState(false);
  const [selectedCallSummary, setSelectedCallSummary] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [followUpLoading, setFollowUpLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const itemsPerPage = 6;

  // Load clients from API
  useEffect(() => {
    loadClients();
  }, []);

  // Auto-close success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Show success message
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setError(null);
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientAPI.getClients();
      
      console.log('🔍 Client API Response:', response);
      console.log('🔍 Response Type:', typeof response);
      console.log('🔍 Response Keys:', Object.keys(response || {}));
      
      if (response.clients && Array.isArray(response.clients)) {
        console.log('✅ Found clients array:', response.clients.length, 'items');
        console.log('🔍 First client data format:', response.clients[0]);
        
        // Convert snake_case API response to title case for UI
        const convertedClients: Client[] = response.clients.map((client: ClientApiResponse) => ({
          client_id: client.client_id,
          'First Name': client.first_name,
          'Last Name': client.last_name,
          'Phone Number': client.phone_number,
          'Reservation Hotel': client.reservation_hotel,
          'Reservation Date': client.reservation_date,
          'Checkin Time': client.checkin_time,
          'Call Date': client.call_date,
          'Call Summary': client.call_summary,
          'To Follow Up': client.to_follow_up,
          'Confirmation Status': client.confirmation_status || 'pending',
          'Occupants': client.occupants || '1'
        }));
        
        setClients(convertedClients);
      } else {
        console.log('❌ No clients array found in response');
        console.log('🔍 Response structure:', JSON.stringify(response, null, 2));
        setClients([]);
      }
    } catch (err) {
      console.error('❌ Error loading clients:', err);
      setError('Failed to load clients from API');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search and status
  const filteredClients = clients.filter(client => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      (client['First Name']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (client['Last Name']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (client['Reservation Hotel']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (client['Phone Number'] || '').includes(searchTerm);

    // Status filter
    const matchesStatus = statusFilter === 'all' || client['Confirmation Status'] === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  // Add new client
  const handleAddClient = async (clientData: Client) => {
    try {
      setLoading(true);
      setError(null);
      await clientAPI.addClient(clientData);
      await loadClients(); // Reload data
      setShowAddModal(false);
      showSuccess('Client added successfully!');
    } catch (err) {
      console.error('Error adding client:', err);
      setError('Failed to add client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit client
  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  // Update client
  const handleUpdateClient = async (clientData: Client) => {
    if (!editingClient?.client_id) {
      setError('Unable to update client: Missing client ID');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await clientAPI.editClient(editingClient.client_id, clientData);
      await loadClients(); // Reload data
      setShowEditModal(false);
      setEditingClient(null);
      showSuccess('Client updated successfully!');
    } catch (err) {
      console.error('Error updating client:', err);
      setError('Failed to update client. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // View full call summary
  const handleViewCallSummary = (callSummary: string, clientName: string) => {
    setSelectedCallSummary(callSummary);
    setSelectedClientName(clientName);
    setShowCallSummaryModal(true);
  };

  // Follow up with client
  const handleFollowUp = async (client: Client) => {
    if (!client.client_id) {
      setError('Unable to follow up: Missing client ID');
      return;
    }

    try {
      setFollowUpLoading(client.client_id);
      setError(null);
      
      console.log('Following up with client:', client);
      const response = await clientAPI.followUpClient(client);
      
      if (response.success) {
        showSuccess(response.message || 'Follow-up initiated successfully!');
        // Optionally reload clients to get updated data
        await loadClients();
      } else {
        setError(response.error || 'Follow-up failed. Please try again.');
      }
    } catch (err) {
      console.error('Error following up with client:', err);
      setError('Failed to initiate follow-up. Please try again.');
    } finally {
      setFollowUpLoading(null);
    }
  };

  return (
    <AuthenticatedLayout requiredPage="clients">
      <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Client Reservations</h1>
          {error && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">
              <p className="text-red-600 text-sm">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 ml-2"
              >
                ✕
              </button>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2 mt-2">
              <p className="text-green-600 text-sm">{successMessage}</p>
              <button 
                onClick={() => setSuccessMessage(null)}
                className="text-green-400 hover:text-green-600 ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadClients}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          {/* <button
            onClick={() => setShowAddModal(true)}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
          >
            Add New Client
          </button> */}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search clients by name, hotel, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="waiting">Waiting</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>


            {statusFilter !== 'all' && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-400">
          {filteredClients.length} of {clients.length} clients
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Reservation Hotel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Reservation Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Check-in Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Call Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Call Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Confirmation Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Occupants
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading clients...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No clients found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client, index) => (
                  <tr key={client.client_id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {client['Phone Number']}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-xs">
                      {client['Reservation Hotel']}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {client['Reservation Date']}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {client['Checkin Time']}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {client['Call Date']}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <div className="truncate flex-1" title={client['Call Summary']}>
                          {client['Call Summary']}
                        </div>
                        {client['Call Summary'] && client['Call Summary'].length > 50 && (
                          <button
                            onClick={() => handleViewCallSummary(client['Call Summary'], `${client['First Name']} ${client['Last Name']}`)}
                            className="flex-shrink-0 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="View full call summary"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client['Confirmation Status'] === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : client['Confirmation Status'] === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : client['Confirmation Status'] === 'waiting'
                          ? 'bg-orange-100 text-orange-800'
                          : client['Confirmation Status'] === 'reserved'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {client['Confirmation Status'] || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {client['Occupants'] || '1'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        {client['To Follow Up'] && (
                          <button
                            onClick={() => handleFollowUp(client)}
                            disabled={followUpLoading === client.client_id}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {followUpLoading === client.client_id ? 'Following...' : 'Follow Up'}
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClient(client)}
                          className="bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800 transition-colors text-xs"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-sm text-gray-700">
            Total Clients: <span className="text-black font-semibold">{clients.length}</span>
          </div>
          <div className="text-sm text-gray-700">
            Confirmed: <span className="text-green-800 font-semibold">
              {filteredClients.filter(client => client['Confirmation Status'] === 'confirmed').length}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            Pending: <span className="text-yellow-800 font-semibold">
              {filteredClients.filter(client => client['Confirmation Status'] === 'pending').length}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            Waiting: <span className="text-orange-800 font-semibold">
              {filteredClients.filter(client => client['Confirmation Status'] === 'waiting').length}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            Reserved: <span className="text-blue-800 font-semibold">
              {filteredClients.filter(client => client['Confirmation Status'] === 'reserved').length}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            Follow-ups Required: <span className="text-blue-800 font-semibold">
              {filteredClients.filter(client => client['To Follow Up']).length}
            </span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClients.length)} of {filteredClients.length} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-md ${
                  currentPage === page
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-black hover:bg-gray-300'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddClient}
        loading={loading}
      />

      {/* Edit Client Modal */}
      {editingClient && (
        <AddClientModal 
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingClient(null);
          }}
          onSubmit={handleUpdateClient}
          loading={loading}
          initialData={editingClient}
          isEdit={true}
        />
      )}

      {/* Call Summary Modal */}
      {showCallSummaryModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden pointer-events-auto border-2 border-gray-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-black">
                Call Summary - {selectedClientName}
              </h3>
              <button
                onClick={() => setShowCallSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedCallSummary}
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setShowCallSummaryModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthenticatedLayout>
  );
}