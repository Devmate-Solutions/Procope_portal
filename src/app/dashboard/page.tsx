'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FaPhoneAlt,
  FaChartLine,
  FaHistory,
  FaUserMd,
  FaCog,
  FaHeadset,
  FaNotesMedical
} from 'react-icons/fa';
import { getCurrentUser, UserProfile } from '@/lib/auth';
import { getDashboardData } from '@/lib/azure-api';
import AuthenticatedLayout from '../components/AuthenticatedLayout';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Get current user
        const currentUser = getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }

        setUser(currentUser);

        // Try to fetch dashboard data, but don't fail if it doesn't work
        try {
          const data = await getDashboardData();
          setDashboardData(data);
        } catch (apiError) {
          console.warn('Dashboard API call failed, using fallback data:', apiError);
          // Create fallback dashboard data from user token
          setDashboardData({
            totalCalls: 0,
            successRate: '0%',
            avgDuration: '0m',
            recentCalls: []
          });
        }
      } catch (error) {
        console.error('Dashboard initialization error:', error);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [router]);



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F4280] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="default"
              size="default"
              className="bg-[#1F4280] hover:bg-[#1F4280]/90"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50">


        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.displayName?.split(' ')[0] || 'User'}!
          </h2>
          <p className="text-gray-600">
            Manage your voice agents and analyze call performance from your {user?.workspaceName} workspace.
          </p>
        </div>

        {/* Quick Stats */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FaPhoneAlt className="h-8 w-8 text-[#1F4280]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.totalCalls || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FaHeadset className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Agents</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {user?.agentIds?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FaChartLine className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.successRate || '0%'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FaNotesMedical className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.avgDuration || '0m'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/analytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <FaChartLine className="h-6 w-6 text-[#1F4280]" />
                  <span>Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  View comprehensive call analytics, performance metrics, and insights.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/create-calls">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <FaPhoneAlt className="h-6 w-6 text-green-600" />
                  <span>Create Calls</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Initiate outbound calls and manage call campaigns.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/call-history">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <FaHistory className="h-6 w-6 text-blue-600" />
                  <span>Call History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Browse and search through your complete call history.
                </p>
              </CardContent>
            </Card>
          </Link>
    
          {/* {(user?.role === 'admin' || user?.role === 'workspace_admin') && (
            <Link href="/agents">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <FaUserMd className="h-6 w-6 text-purple-600" />
                    <span>Agent Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Configure and manage your voice agents.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link href="/settings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <FaCog className="h-6 w-6 text-gray-600" />
                    <span>Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Manage workspace settings and configurations.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )} */}
        </div>

        {/* Recent Activity */}
        {dashboardData?.recentCalls && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentCalls.slice(0, 5).map((call: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{call.to_number || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(call.start_timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={call.call_status === 'completed' ? 'default' : 'secondary'}>
                        {call.call_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </main>
      </div>
    </AuthenticatedLayout>
  );
}
