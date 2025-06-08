'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  FaPhoneAlt, 
  FaChartLine, 
  FaHistory, 
  FaClinicMedical, 
  FaUserMd, 
  FaCog,
  FaHeadset,
  FaNotesMedical
} from 'react-icons/fa';
import logo from '../../public/logov2.png'
export default function Home() {
  const [apiKey, setApiKey] = useState('');
  
  useEffect(() => {
    // Check if API key is configured (just for display purposes)
    const key = process.env.NEXT_PUBLIC_RETELL_API_KEY || '';
    setApiKey(key ? 'Configured' : 'Not Configured');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-4">
            <Image 
              src={logo} 
              alt="ORASURG Logo" 
              width={200} 
              height={60} 
              className="object-contain"
            />
          </div>
        </div>

        {/* Hero Section Inspired by ORASURG */}
        <div className=" bg-[#1F4280] rounded-xl p-8 mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">
            AI-Powered Dental Practice Management
          </h1>
          <p className="text-white max-w-2xl">
            Transform your dental practice with advanced AI-driven call management and analytics. 
            Streamline patient interactions, improve communication, and gain actionable insights.
          </p>
        </div>

    
        
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-[#1F4280] text-white">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link 
                href="/create-calls" 
                className="group p-6 border border-gray-100 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-[#1F4280] rounded-lg group-hover:bg-primary/20">
                    <FaPhoneAlt className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Create Call</h3>
                </div>
                <p className="text-sm text-gray-600">Schedule and manage patient calls</p>
              </Link>
              
              <Link 
                href="/analytics" 
                className="group p-6 border border-gray-100 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-[#1F4280] text-white rounded-lg group-hover:bg-primary/20">
                    <FaChartLine className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Analytics</h3>
                </div>
                <p className="text-sm text-gray-600">Detailed practice performance insights</p>
              </Link>
              
              <Link 
                href="/call-history" 
                className="group p-6 border border-gray-100 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-[#1F4280] text-white rounded-lg group-hover:bg-primary/20">
                    <FaHistory className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Call History</h3>
                </div>
                <p className="text-sm text-gray-600">Review and analyze past interactions</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
