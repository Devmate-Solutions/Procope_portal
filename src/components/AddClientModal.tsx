'use client';

import { useState } from 'react';
import { type Client } from '@/lib/aws-api';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clientData: Client) => Promise<void>;
  loading: boolean;
  initialData?: Client;
  isEdit?: boolean;
}

export default function AddClientModal({ isOpen, onClose, onSubmit, loading, initialData, isEdit = false }: AddClientModalProps) {
  const [formData, setFormData] = useState<Client>(initialData || {
    'First Name': '',
    'Last Name': '',
    'Phone Number': '',
    'Reservation Hotel': '',
    'Reservation Date': '',
    'Checkin Time': '3:00 PM',
    'Call Date': '',
    'Call Summary': '',
    'To Follow Up': false,
    'Confirmation Status': 'pending',
    'Occupants': '1'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData['First Name'] || !formData['Last Name'] || !formData['Phone Number']) {
      alert('Please fill in required fields: First Name, Last Name, and Phone Number');
      return;
    }
    await onSubmit(formData);
    // Reset form
    setFormData({
      'First Name': '',
      'Last Name': '',
      'Phone Number': '',
      'Reservation Hotel': '',
      'Reservation Date': '',
      'Checkin Time': '3:00 PM',
      'Call Date': '',
      'Call Summary': '',
      'To Follow Up': false,
      'Confirmation Status': 'pending',
      'Occupants': '1'
    });
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-black">Edit Client</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData['First Name']}
                  onChange={(e) => setFormData({ ...formData, 'First Name': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData['Last Name']}
                  onChange={(e) => setFormData({ ...formData, 'Last Name': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData['Phone Number']}
                onChange={(e) => setFormData({ ...formData, 'Phone Number': e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reservation Hotel
              </label>
              <input
                type="text"
                value={formData['Reservation Hotel']}
                onChange={(e) => setFormData({ ...formData, 'Reservation Hotel': e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reservation Date
                </label>
                <input
                  type="date"
                  value={formData['Reservation Date']}
                  onChange={(e) => setFormData({ ...formData, 'Reservation Date': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Time
                </label>
                <input
                  type="text"
                  value={formData['Checkin Time']}
                  onChange={(e) => setFormData({ ...formData, 'Checkin Time': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Date
              </label>
              <input
                type="date"
                value={formData['Call Date']}
                onChange={(e) => setFormData({ ...formData, 'Call Date': e.target.value })}
                defaultValue={getCurrentDate()}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Summary
              </label>
              <textarea
                value={formData['Call Summary']}
                onChange={(e) => setFormData({ ...formData, 'Call Summary': e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Brief summary of the call..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Occupants
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData['Occupants']}
                  onChange={(e) => setFormData({ ...formData, 'Occupants': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requires Follow Up
                </label>
                <select
                  value={formData['To Follow Up'] ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, 'To Follow Up': e.target.value === 'true' })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmation Status
                </label>
                <select
                  value={formData['Confirmation Status']}
                  onChange={(e) => setFormData({ ...formData, 'Confirmation Status': e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
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
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}