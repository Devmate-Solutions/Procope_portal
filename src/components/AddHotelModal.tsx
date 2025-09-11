'use client';

import { useState } from 'react';
import { type Hotel } from '@/lib/aws-api';

interface AddHotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (hotelData: Hotel) => Promise<void>;
  loading: boolean;
  initialData?: Hotel;
  isEdit?: boolean;
}

export default function AddHotelModal({ isOpen, onClose, onSubmit, loading, initialData, isEdit = false }: AddHotelModalProps) {
  const [formData, setFormData] = useState<Hotel>(initialData || {
    'Hotel Name': '',
    'Street Address': '',
    'City': '',
    'State': '',
    'Zip Code': '',
    'Double Bed': '0',
    'Single Bed': '0',
    'Reservations': '',
    'Waiting List': '',
    'Price': '',
    'Checkin Time': '3:00 PM',
    'Checkout Time': '11:00 AM'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData['Hotel Name'] || !formData['City'] || !formData['State']) {
      alert('Please fill in required fields: Hotel Name, City, and State');
      return;
    }
    await onSubmit(formData);
    // Reset form
    setFormData({
      'Hotel Name': '',
      'Street Address': '',
      'City': '',
      'State': '',
      'Zip Code': '',
      'Double Bed': '0',
      'Single Bed': '0',
      'Reservations': '',
      'Waiting List': '',
      'Price': '',
      'Checkin Time': '3:00 PM',
      'Checkout Time': '11:00 AM'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-black">{isEdit ? 'Edit Hotel' : 'Add New Hotel'}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hotel Name *
              </label>
              <input
                type="text"
                value={formData['Hotel Name']}
                onChange={(e) => setFormData({ ...formData, 'Hotel Name': e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData['Street Address']}
                onChange={(e) => setFormData({ ...formData, 'Street Address': e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData['City']}
                  onChange={(e) => setFormData({ ...formData, 'City': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  value={formData['State']}
                  onChange={(e) => setFormData({ ...formData, 'State': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code
                </label>
                <input
                  type="text"
                  value={formData['Zip Code']}
                  onChange={(e) => setFormData({ ...formData, 'Zip Code': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>
                <input
                  type="text"
                  value={formData['Price']}
                  onChange={(e) => setFormData({ ...formData, 'Price': e.target.value })}
                  placeholder="$100"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Double Bed
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData['Double Bed']}
                  onChange={(e) => setFormData({ ...formData, 'Double Bed': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Single Bed
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData['Single Bed']}
                  onChange={(e) => setFormData({ ...formData, 'Single Bed': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reservations
                </label>
                <input
                  type="text"
                  value={formData['Reservations']}
                  onChange={(e) => setFormData({ ...formData, 'Reservations': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waiting List
                </label>
                <input
                  type="text"
                  value={formData['Waiting List']}
                  onChange={(e) => setFormData({ ...formData, 'Waiting List': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Time
                </label>
                <input
                  type="text"
                  value={formData['Checkin Time']}
                  onChange={(e) => setFormData({ ...formData, 'Checkin Time': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Time
                </label>
                <input
                  type="text"
                  value={formData['Checkout Time']}
                  onChange={(e) => setFormData({ ...formData, 'Checkout Time': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-black rounded-md hover:bg-gray-300 transition-colors border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Hotel' : 'Add Hotel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}