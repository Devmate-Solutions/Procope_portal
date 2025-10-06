'use client';

import { useState, useEffect } from 'react';
import { hotelAPI, type Hotel, type HotelApiResponse } from '@/lib/aws-api';

import { AuthenticatedLayout } from '@/app/components/AuthenticatedLayout';
import AddHotelModal from '@/components/AddHotelModal';


export default function HotelsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingCell, setEditingCell] = useState<{hotelId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [waitingListFilter, setWaitingListFilter] = useState<string>('all');
  const itemsPerPage = 8;

  // Load hotels from API
  useEffect(() => {
    loadHotels();
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

  const loadHotels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await hotelAPI.getHotels();
      
      console.log('🏨 Hotel API Response:', response);
      console.log('🏨 Response Type:', typeof response);
      console.log('🏨 Response Keys:', Object.keys(response || {}));
      
      if (response.hotels && Array.isArray(response.hotels)) {
        console.log('✅ Found hotels array:', response.hotels.length, 'items');
        console.log('🏨 First hotel data format:', response.hotels[0]);
        
        // Convert snake_case API response to title case for UI
        const convertedHotels: Hotel[] = response.hotels.map((hotel: HotelApiResponse) => ({
          hotel_id: hotel.hotel_id,
          'Hotel Name': hotel.hotel_name,
          'Street Address': hotel.street_address || '',
          'City': hotel.city,
          'State': hotel.estate,
          'Zip Code': hotel.zip_code || '',
          'Double Bed': hotel.double_available,
          'Single Bed': hotel.single_available,
          'price_weekly': hotel.price_weekly, // New field - to be populated from API or calculated
          'Waiting List': '', // New field - to be populated from API or calculated
          'Amenities': '', // New field - to be populated from API
          'Price': hotel.price,
          'Checkin Time': hotel.checkin_time,
          'Checkout Time': hotel.checkout_time
        }));
        
        setHotels(convertedHotels);
      } else {
        console.log('❌ No hotels array found in response');
        console.log('🏨 Response structure:', JSON.stringify(response, null, 2));
        setHotels([]);
      }
    } catch (err) {
      console.error('❌ Error loading hotels:', err);
      setError('Failed to load hotels from API');
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter hotels based on search and waiting list
  const filteredHotels = hotels.filter(hotel => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      (hotel['Hotel Name']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (hotel['City']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (hotel['State']?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    // Waiting list filter
    const matchesWaitingList = waitingListFilter === 'all' ||
      (waitingListFilter === 'yes' && hotel['Waiting List'] && hotel['Waiting List'] !== '0' && hotel['Waiting List'] !== '') ||
      (waitingListFilter === 'no' && (!hotel['Waiting List'] || hotel['Waiting List'] === '0' || hotel['Waiting List'] === ''));

    return matchesSearch && matchesWaitingList;
  });

  // Pagination
  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHotels = filteredHotels.slice(startIndex, startIndex + itemsPerPage);

  // Add new hotel
  const handleAddHotel = async (hotelData: Hotel) => {
    try {
      setLoading(true);
      setError(null);
      await hotelAPI.addHotel(hotelData);
      await loadHotels(); // Reload data
      setShowAddModal(false);
      showSuccess('Hotel added successfully!');
    } catch (err) {
      console.error('Error adding hotel:', err);
      setError('Failed to add hotel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit hotel
  const handleEditHotel = (hotel: Hotel) => {
    console.log('🏨 Edit clicked - Hotel ID:', hotel.hotel_id);
    console.log('🏨 Edit clicked - Full hotel object:', hotel);
    setEditingHotel(hotel);
    setShowEditModal(true);
  };

  // Update hotel
  const handleUpdateHotel = async (hotelData: Hotel) => {
    if (!editingHotel?.hotel_id) {
      setError('Unable to update hotel: Missing hotel ID');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await hotelAPI.editHotel(editingHotel.hotel_id, hotelData);
      await loadHotels(); // Reload data
      setShowEditModal(false);
      setEditingHotel(null);
      showSuccess('Hotel updated successfully!');
    } catch (err) {
      console.error('Error updating hotel:', err);
      setError('Failed to update hotel. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start inline editing
  const startEditing = (hotelId: string, field: string, currentValue: string) => {
    setEditingCell({ hotelId, field });
    setEditValue(currentValue);
  };

  // Cancel inline editing
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Save inline edit
  const saveInlineEdit = async (hotelId: string, field: string) => {
    if (!editValue.trim()) {
      cancelEditing();
      return;
    }

    try {
      const hotelToUpdate = hotels.find(h => h.hotel_id === hotelId);
      if (!hotelToUpdate) {
        setError('Hotel not found');
        return;
      }

      const updatedHotel = { 
        ...hotelToUpdate, 
        [field]: editValue 
      };

      await hotelAPI.editHotel(hotelId, updatedHotel);
      await loadHotels();
      showSuccess(`${field} updated successfully!`);
      cancelEditing();
    } catch (err) {
      console.error('Error updating hotel field:', err);
      setError(`Failed to update ${field}. Please try again.`);
      cancelEditing();
    }
  };

  // Handle key press in inline edit
  const handleKeyPress = (e: React.KeyboardEvent, hotelId: string, field: string) => {
    if (e.key === 'Enter') {
      saveInlineEdit(hotelId, field);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Render editable cell
  const renderEditableCell = (hotel: Hotel, field: keyof Hotel, value: string) => {
    const hotelId = hotel.hotel_id || '';
    const isEditing = editingCell?.hotelId === hotelId && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveInlineEdit(hotelId, field)}
          onKeyPress={(e) => handleKeyPress(e, hotelId, field)}
          className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(hotelId, field, value)}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center"
        title="Click to edit"
      >
        {value || '-'}
      </div>
    );
  };

  return (
    <AuthenticatedLayout requiredPage="hotels">
      <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Hotels Management</h1>
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
            onClick={loadHotels}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
          >
            Add New Hotel
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search hotels by name, city, or state..."
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
              <label className="text-sm font-medium text-gray-700">Waiting List:</label>
              <select
                value={waitingListFilter}
                onChange={(e) => {
                  setWaitingListFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All</option>
                <option value="yes">Has Waiting List</option>
                <option value="no">No Waiting List</option>
              </select>
            </div>

            {waitingListFilter !== 'all' && (
              <button
                onClick={() => {
                  setWaitingListFilter('all');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-400">
          {filteredHotels.length} of {hotels.length} hotels
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Hotel Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Street Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Zip Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Double Bed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Single Bed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Price Weekly
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Amenities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Price Nightly
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Check-in Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Check-out Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading hotels...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedHotels.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-8 text-center text-gray-400">
                    No hotels found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedHotels.map((hotel, index) => (
                  <tr key={hotel.hotel_id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm text-black">
                      {renderEditableCell(hotel, 'Hotel Name', hotel['Hotel Name'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'Street Address', hotel['Street Address'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'City', hotel['City'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'State', hotel['State'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'Zip Code', hotel['Zip Code'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'Double Bed', hotel['Double Bed'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'Single Bed', hotel['Single Bed'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'price_weekly', hotel['price_weekly'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'Amenities', hotel['Amenities'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'Price', hotel['Price'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'Checkin Time', hotel['Checkin Time'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {renderEditableCell(hotel, 'Checkout Time', hotel['Checkout Time'] || '')}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={() => handleEditHotel(hotel)}
                        className="bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800 transition-colors text-xs"
                      >
                        Edit Modal
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredHotels.length)} of {filteredHotels.length} results
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

      {/* Add Hotel Modal */}
      <AddHotelModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddHotel}
        loading={loading}
      />

      {/* Edit Hotel Modal */}
      {editingHotel && (
        <AddHotelModal 
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingHotel(null);
          }}
          onSubmit={handleUpdateHotel}
          loading={loading}
          initialData={editingHotel}
          isEdit={true}
        />
      )}
      </div>
    </AuthenticatedLayout>
  );
}