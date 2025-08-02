"use client"

import { useEffect, useState } from 'react'
import { AuthenticatedLayout } from '@/app/components/AuthenticatedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, Users, BarChart3, Clock, TrendingUp, Activity } from 'lucide-react'
import { getDashboardData, getCalls, getAnalytics } from '@/lib/aws-api'
import { getCurrentUser } from '@/lib/auth'

interface DashboardStats {
  totalCalls: number
  totalAgents: number
  averageDuration: string
  successRate: number
  recentCalls: any[]
  agents: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    totalAgents: 0,
    averageDuration: '0:00',
    successRate: 0,
    recentCalls: [],
    agents: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const user = getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      console.log('Loading dashboard data...')

      // Get dashboard data and recent calls with error handling
      const [dashboardResult, recentCallsResult, analyticsResult] = await Promise.allSettled([
        getDashboardData(),
        getCalls({ limit: 10 }),
        getAnalytics()
      ])

      let dashboard: any = {
        agents: [],
        permissions: {},
        stats: { totalAgents: 0, accessibleAgents: 0, workspaceRole: 'user' }
      }
      let recentCalls: any[] = []
      let analytics: any = {
        callCount: 0,
        callDuration: { totalDuration: 0, formattedDuration: '0:00' },
        callSuccessData: { successful: 0, unsuccessful: 0, unknown: 0 }
      }

      if (dashboardResult.status === 'fulfilled') {
        dashboard = dashboardResult.value
      } else {
        console.warn('Dashboard data failed:', dashboardResult.reason)
      }

      if (recentCallsResult.status === 'fulfilled') {
        recentCalls = Array.isArray(recentCallsResult.value) ? recentCallsResult.value : []
      } else {
        console.warn('Recent calls failed:', recentCallsResult.reason)
      }

      if (analyticsResult.status === 'fulfilled') {
        analytics = analyticsResult.value
      } else {
        console.warn('Analytics failed:', analyticsResult.reason)
      }

      // Calculate stats with fallbacks
      const totalCalls = analytics.callCount || recentCalls.length || 0
      const agents = dashboard.agents || user.agentIds?.map((id: string, index: number) => ({
        id,
        name: `Agent ${index + 1}`,
        status: 'active'
      })) || []

      // Calculate success rate from analytics or recent calls
      let successRate = 0
      if (analytics.callSuccessData) {
        const { successful = 0, unsuccessful = 0, unknown = 0 } = analytics.callSuccessData
        const total = successful + unsuccessful + unknown
        successRate = total > 0 ? Math.round((successful / total) * 100) : 0
      } else if (recentCalls.length > 0) {
        const successfulCalls = recentCalls.filter(call => {
          if (call.call_analysis?.call_successful !== undefined) {
            return call.call_analysis.call_successful
          }
          return call.call_status === 'ended' && 
                 ['user_hangup', 'agent_hangup', 'call_transfer'].includes(call.disconnection_reason)
        }).length
        successRate = Math.round((successfulCalls / recentCalls.length) * 100)
      }

      setStats({
        totalCalls,
        totalAgents: agents.length,
        averageDuration: analytics.callDuration?.formattedDuration || '0:00',
        successRate,
        recentCalls: recentCalls.slice(0, 5), // Show only 5 recent calls
        agents
      })

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setError('Some dashboard data may be unavailable. Please check your connection.')
      
      // Set minimal fallback data
      const user = getCurrentUser()
      if (user) {
        setStats({
          totalCalls: 0,
          totalAgents: user.agentIds?.length || 0,
          averageDuration: '0:00',
          successRate: 0,
          recentCalls: [],
          agents: user.agentIds?.map((id: string, index: number) => ({
            id,
            name: `Agent ${index + 1}`,
            status: 'active'
          })) || []
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (durationMs: number): string => {
    if (!durationMs) return '0:00'
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp) return 'Unknown'
    return new Date(timestamp).toLocaleString()
  }

  if (isLoading) {
    return (
      <AuthenticatedLayout requiredPage="dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout requiredPage="dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your call center performance
          </p>
        </div>

        {error && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-yellow-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
              <p className="text-xs text-muted-foreground">
                All time calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
              <p className="text-xs text-muted-foreground">
                Available agents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageDuration}</div>
              <p className="text-xs text-muted-foreground">
                Per call average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                Call completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Calls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentCalls.length > 0 ? (
                  stats.recentCalls.map((call, index) => (
                    <div key={call.call_id || index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={call.call_status === 'ended' ? 'default' : 'secondary'}>
                            {call.call_status || 'Unknown'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {call.direction || 'outbound'}
                          </span>
                        </div>
                        <div className="text-sm">
                          {call.from_number} → {call.to_number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(call.start_timestamp)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatDuration(call.duration_ms)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Agent: {call.agent_id?.slice(-6) || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  ))
                ) :(
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent calls found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agents Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.agents.length > 0 ? (
                  stats.agents.map((agent, index) => (
                    <div key={agent.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {agent.name || `Agent ${index + 1}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {agent.id?.slice(-8) || 'Unknown'}
                        </div>
                      </div>
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status || 'active'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No agents configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
