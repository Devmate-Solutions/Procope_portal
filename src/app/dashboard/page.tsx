'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  BarChart3,
  History,
  Users,
  Clock,
  TrendingUp,
  Headphones,
  NotepadText,
  UserPlus,
  FileText,
  Building
} from 'lucide-react';
import { getCurrentUser, hasPageAccess, type UserProfile } from '@/lib/auth';
import { getDashboardData, getCalls, getAnalytics } from '@/lib/aws-api';
import { AuthenticatedLayout } from '@/app/components/AuthenticatedLayout';
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
          const [dashboardResult, recentCallsResult, analyticsResult] = await Promise.allSettled([
            getDashboardData(),
            getCalls({ limit: 10 }),
            getAnalytics()
          ]);

          let dashboard: any = {
            agents: [],
            permissions: {},
            stats: { totalAgents: 0, accessibleAgents: 0, workspaceRole: 'user' }
          };
          let recentCalls: any[] = [];
          let analytics: any = {
            callCount: 0,
            callDuration: { totalDuration: 0, formattedDuration: '0m' },
            callSuccessData: { successful: 0, unsuccessful: 0, unknown: 0 }
          };

          if (dashboardResult.status === 'fulfilled') {
            dashboard = dashboardResult.value;
          }

          if (recentCallsResult.status === 'fulfilled') {
            recentCalls = Array.isArray(recentCallsResult.value) ? recentCallsResult.value : [];
          }

          if (analyticsResult.status === 'fulfilled') {
            analytics = analyticsResult.value;
          }

          // Create combined dashboard data
          setDashboardData({
            totalCalls: analytics.callCount || recentCalls.length || 0,
            successRate: analytics.callSuccessData ? 
              (() => {
                const { successful = 0, unsuccessful = 0, unknown = 0 } = analytics.callSuccessData;
                const total = successful + unsuccessful + unknown;
                return total > 0 ? `${Math.round((successful / total) * 100)}%` : '0%';
              })() : '0%',
            avgDuration: analytics.callDuration?.formattedDuration || '0m',
            recentCalls: recentCalls.slice(0, 5),
            agents: dashboard.agents || []
          });
        } catch (apiError) {
          console.warn('Dashboard API call failed, using fallback data:', apiError);
          // Create fallback dashboard data from user token
          setDashboardData({
            totalCalls: 0,
            successRate: '0%',
            avgDuration: '0m',
            recentCalls: [],
            agents: []
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
      <AuthenticatedLayout requiredPage="dashboard">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F4280] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout requiredPage="dashboard">
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
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout requiredPage="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}!
            </h2>
            <p className="text-gray-600">
              Manage your voice agents and analyze call performance from your workspace.
            </p>
          </div>

          {/* Quick Stats */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <PhoneCall className="h-8 w-8 text-[#1F4280]" />
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
                    <Headphones className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Agents</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {user?.agentIds?.length || dashboardData.agents?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
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
                    <Clock className="h-8 w-8 text-purple-600" />
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
            {/* Check if user has special access pages */}
            {(() => {
              const hasHotelAccess = user?.allowedPages?.includes('hotel')
              const hasFlowerAccess = user?.allowedPages?.includes('flower') || user?.workspaceName === 'Atlanta Flower Shop'

              if (hasFlowerAccess) {
                // Show dashboard and orders for Atlanta Flower Shop
                return (
                  <>
                    {hasPageAccess(user, 'orders') && (
                      <Link href="/orders">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-[#1F4280]" />
                              <span>Orders</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600">
                              View and manage all flower shop orders.
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    )}
                  </>
                )
              } else if (hasHotelAccess) {
                // Only show analytics, clients, and hotels for hotel users
                return (
                  <>
                    {hasPageAccess(user, 'analytics') && (
                      <Link href="/analytics">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <BarChart3 className="h-6 w-6 text-[#1F4280]" />
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
                    )}

                    {hasPageAccess(user, 'clients') && (
                      <Link href="/clients">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <Users className="h-6 w-6 text-blue-600" />
                              <span>Clients</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600">
                              Manage client reservations and information.
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    )}

                    {hasPageAccess(user, 'hotels') && (
                      <Link href="/hotels">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <Building className="h-6 w-6 text-green-600" />
                              <span>Hotels</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600">
                              Manage hotel information and availability.
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    )}
                  </>
                )
              } else {
                // Show all pages for non-hotel users
                return (
                  <>
                    {hasPageAccess(user, 'analytics') && (
                      <Link href="/analytics">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <BarChart3 className="h-6 w-6 text-[#1F4280]" />
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
                    )}

                    {hasPageAccess(user, 'create-calls') && (
                      <Link href="/create-calls">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <PhoneCall className="h-6 w-6 text-green-600" />
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
                    )}

                    {hasPageAccess(user, 'call-history') && (
                      <Link href="/call-history">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <History className="h-6 w-6 text-blue-600" />
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
                    )}

                    {hasPageAccess(user, 'scribe') && (
                      <Link href="/scribe">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <NotepadText className="h-6 w-6 text-purple-600" />
                              <span>Scribe</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600">
                              AI-powered transcription and note-taking for calls.
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    )}

                    {hasPageAccess(user, 'scribe-history') && (
                      <Link href="/scribe-history">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-indigo-600" />
                              <span>Scribe History</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600">
                              View and manage your transcription history.
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    )}

                    {hasPageAccess(user, 'user-management') && (
                      <Link href="/user-management">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <Users className="h-6 w-6 text-orange-600" />
                              <span>User Management</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600">
                              Manage users, roles, and permissions.
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    )}

                    {hasPageAccess(user, 'add-user') && (
                      <Link href="/add-user">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <UserPlus className="h-6 w-6 text-teal-600" />
                              <span>Add User</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600">
                              Add new users to the system.
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    )}

                    {hasPageAccess(user, 'claims-archive') && (
                      <Link href="/claims-archive">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-red-600" />
                              <span>Claims Archive</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600">
                              View and manage archived claims.
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    )}
                  </>
                )
              }
            })()}
          </div>

          {/* Recent Activity */}
          {/* {dashboardData?.recentCalls && dashboardData.recentCalls.length > 0 && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentCalls.map((call: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{call.to_number || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">
                            {call.start_timestamp ? new Date(call.start_timestamp).toLocaleString() : 'Unknown time'}
                          </p>
                        </div>
                        <Badge variant={call.call_status === 'ended' ? 'default' : 'secondary'}>
                          {call.call_status || 'unknown'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )} */}
      </div>
    </AuthenticatedLayout>
  );
}
