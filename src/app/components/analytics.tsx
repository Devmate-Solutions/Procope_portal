"use client"
// Add router to the component


import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Filter, Plus, RefreshCw, AlertCircle, X, LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import type { DateRange } from "react-day-picker"
import { AddCustomChart } from "./add-custom-chart"
import { CallDirectionChart } from "./call-direction-chart"
import { CallSuccessChart } from "./call-success-chart"
import { CallTrendsChart } from "./call-trends-chart"
import { DateRangePicker } from "./date-range-picker"
import { DisconnectionReasonChart } from "./disconnection-reason-chart"
import { MetricCard } from "./metric-card"
import { UserSentimentChart } from "./user-sentiment-chart"
import { CustomChart } from "./custom-chart"
import { getAnalytics, getCurrentUser, getUserAgentIds, getAgents } from '@/lib/azure-api'
import { getCurrentUser as getAuthUser } from '@/lib/auth'
import { LocalStorage } from "@azure/msal-browser"


interface AnalyticsData {
  totalCalls: number
  averageDuration: string
  averageLatency: string
  chartData: any[]
  agents: string[]
  rawCalls: any[]
  apiStatus?: string
  selectedAgentId?: string
}

interface CustomChart {
  id: string
  title: string // Should be "Call Duration", "Call Latency", etc.
  type: string // Chart type: "column", "bar", etc.
  metric: string // Unit: "calls", "seconds", "ms", "%", "score"
  dateRange: string
  size: string
  agent: string
  data: any[]
  viewBy: string
  savedDateRange?: { from: Date; to: Date }
  filterByDateRange?: boolean
}

export function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalCalls: 0,
    averageDuration: "00:00",
    averageLatency: "0ms",
    chartData: [],
    agents: [],
    rawCalls: [],
    apiStatus: "loading",
  })
  const router = useRouter()
  const [dateRange, setDateRange] = useState("All time")
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>()
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [showAddChart, setShowAddChart] = useState(false)
  const [customCharts, setCustomCharts] = useState<CustomChart[]>(() => {
    // Safely check for localStorage and parse
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedCharts = localStorage.getItem('customCharts')
        return savedCharts ? JSON.parse(savedCharts) : []
      }
    } catch (error) {

    }
    return []
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [agentNames, setAgentNames] = useState<Record<string, string>>({})
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [availableAgentIds, setAvailableAgentIds] = useState<string[]>([]) // Store API agent IDs


  
  // Helper function to get agent display name (same logic as create calls)
  const getAgentDisplayName = (agentId: string): string => {
    // Check if this agent ID is mapped in agentNames
    const agentName = agentNames[agentId];//
  //  console.log("lastagent",agentName,agentNames,agentId);
    if (agentName) {
      // Extract just "Inbound Agent" or "Outbound Agent" without phone number
      if (agentName.toLowerCase().includes('inbound')) {
        return "Inbound Agent";
      } else if (agentName.toLowerCase().includes('outbound')) {
        return "Outbound Agent";
      }
      return agentName;
    }
    
    // Fallback if no mapping found
    return `Agent: ${agentId.substring(0, 8)}...`;
  }

  // Fetch agent names directly from API (same logic as create calls)
  const fetchAgentNames = async () => {
    try {
      // Get bearer token from localstorage
      const token = localStorage.getItem("auth_token");
    
      console.log(token);
      // Call API directly
      const response = await fetch('https://func-retell425.azurewebsites.net/api/retell/phone-number', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const phoneNumbersData = await response.json();
      const nameMap: Record<string, string> = {};
      const availableAgentIds: string[] = [];
      console.log("AGENTS from API:", phoneNumbersData);

      if (Array.isArray(phoneNumbersData)) {
        setPhoneNumbers(phoneNumbersData);
        
        // Process all agents from all phone numbers (same as create calls)
        phoneNumbersData.forEach((phoneData: any) => {
          // Add inbound agent if exists
          if (phoneData.inbound_agent_id) {
            nameMap[phoneData.inbound_agent_id] = `Inbound Agent (${phoneData.phone_number_pretty})`;
            availableAgentIds.push(phoneData.inbound_agent_id);
          }
          // Add outbound agent if exists
          if (phoneData.outbound_agent_id) {
            nameMap[phoneData.outbound_agent_id] = `Outbound Agent (${phoneData.phone_number_pretty})`;
            availableAgentIds.push(phoneData.outbound_agent_id);
          }
        });

        // Update available agent IDs from API only
        setAvailableAgentIds(availableAgentIds);

        // Set default agent to the first available agent if none selected
        if (!selectedAgentId && availableAgentIds.length > 0) {
          setSelectedAgentId(availableAgentIds[0]);
        }

        console.log('📋 Agent names loaded:', nameMap);
        console.log('📞 Phone numbers loaded:', phoneNumbersData);
        console.log('🤖 Available agents from API:', availableAgentIds);
      }

      setAgentNames(nameMap);
    } catch (error) {
      console.error('Failed to fetch agent names:', error);
      // Set empty object as fallback
      setAgentNames({});
    }
  };

  // Initialize user and agent data
  useEffect(() => {
    const currentUser = getAuthUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    // Set the first agent as default if available will be set after API call
    
    // Fetch agent names
    fetchAgentNames();
  }, [router]);

  useEffect(() => {
    fetchAnalytics()
  }, [selectedDateRange, selectedAgentId])

  useEffect(() => {
    // Set default date range on mount
    if (!selectedDateRange) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const fourWeeksAgo = new Date(today)
      fourWeeksAgo.setDate(today.getDate() - 28)

      setSelectedDateRange({ from: fourWeeksAgo, to: today })
      setDateRange("Last 4 weeks")
    }
  }, [])

  // Update local storage only on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('customCharts', JSON.stringify(customCharts))
    }
  }, [customCharts])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setIsRefreshing(true)

      console.log('🔄 Fetching analytics data...');

      // Build filters object for Azure API
      const filters: any = {}

      // Add date range parameters if selected
      if (selectedDateRange?.from && selectedDateRange?.to) {
        // Convert to timestamp format for Azure API
        const fromTimestamp = selectedDateRange.from.getTime()
        const toTimestamp = selectedDateRange.to.getTime() + (24 * 60 * 60 * 1000 - 1)

        filters.start_timestamp_after = fromTimestamp.toString()
        filters.start_timestamp_before = toTimestamp.toString()
      }

      // Add agent_id parameter - Azure API will filter by user's accessible agents
      if (selectedAgentId && selectedAgentId !== "all") {
        filters.agent_id = selectedAgentId
      }

      // Call Azure Function API
      console.log('📡 Calling getAnalytics with filters:', filters);
      const data = await getAnalytics(filters)
      console.log('📦 Analytics response:', data);

      if (data.error) {
        setError(data.error)
        setAnalyticsData({
          ...analyticsData,
          apiStatus: "error",
        })
      } else {
        // Map backend response to frontend format
        const mappedData = {
          totalCalls: data.callCount || 0,
          averageDuration: data.callDuration?.formattedDuration || "0m 0s",
          averageLatency: data.callLatency ? `${data.callLatency}ms` : "0ms",
          chartData: [], // Will be populated from rawCalls if needed
          agents: Object.keys(agentNames), // Use actual agent IDs from API
          rawCalls: [], // Backend doesn't return individual calls in analytics
          apiStatus: "success",
          selectedAgentId: selectedAgentId,
          // Additional analytics data
          callSuccessData: data.callSuccessData || { successful: 0, unsuccessful: 0, unknown: 0 },
          disconnectionData: data.disconnectionData || {},
          directionData: data.directionData || {},
          callAnalytics: data.callAnalytics || {},
          callDuration: data.callDuration || { totalDuration: 0, formattedDuration: "0m 0s" },
          // Store agent names for display
          agentNames: data.agentNames || {}
        };

        console.log('📊 Mapped analytics data:', mappedData);
        setAnalyticsData(mappedData);

        if (mappedData.totalCalls === 0) {
          setError("No call data found for the selected period")
        }
      }
    } catch (error) {
      console.error('Analytics fetch error:', error)
      setError(error instanceof Error ? error.message : "Failed to load data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAnalytics()
    setIsRefreshing(false)
  }

  const handleDateRangeChange = (value: string, range?: DateRange) => {
    setDateRange(value)
    setSelectedDateRange(range)
  }

  const handleAddChart = (chartConfig: any) => {
    try {
      const newChart: CustomChart = {
        id: Date.now().toString(),
        title: chartConfig.title,
        type: chartConfig.chartType,
        metric: chartConfig.label,
        dateRange: chartConfig.dateRange,
        size: chartConfig.size,
        agent: chartConfig.agent,
        data: chartConfig.previewData || [],
        viewBy: chartConfig.viewBy,
        savedDateRange: chartConfig.selectedDateRange,
        filterByDateRange: true,
      }

      setCustomCharts(prevCharts => [...prevCharts, newChart])
      setShowAddChart(false)
    } catch (error) {
      
      
    }
  }

  const getAgentDisplay = () => {
    if (selectedAgentId && selectedAgentId !== "all") {
      return getAgentDisplayName(selectedAgentId);
    }

    return `All Agents (${user?.agentIds?.length || 0})`
  }

  const getGridClasses = () => {
    if (customCharts.length === 0) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"

    const hasLarge = customCharts.some((chart) => chart.size === "Large")
    if (hasLarge) {
      return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    }
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  }

 

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-medium text-gray-900">Analytics</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing} 
            className=""
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddChart(true)} 
            className=""
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Chart
          </Button>
         
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

        {/* Agent Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {user?.workspaceName} - {getAgentDisplay()}
          </span>
          {user?.agentIds && user.agentIds.length > 1 && (
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">All Agents</option>
              {user.agentIds.map((agentId: string) => {
                const displayName = getAgentDisplayName(agentId);
                return (
                  <option key={agentId} value={agentId}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </div>

      {/* Default Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Call Counts"
          value={isLoading ? "..." : (analyticsData?.totalCalls?.toString() || "0")}
          metric="calls"
          chartData={analyticsData?.chartData?.map((item) => ({ ...item, value: item.calls || 0 })) || []}
          isLoading={isLoading}
          chartType="line"
          subtitle=""
        />
        <MetricCard
          title="Call Duration"
          value={isLoading ? "..." : (analyticsData?.averageDuration || "0m")}
          metric="duration"
          chartData={analyticsData?.chartData?.map((item) => ({ ...item, value: item.duration || 0 })) || []}
          isLoading={isLoading}
          chartType="line"
          subtitle=""
        />
        <MetricCard
          title="Call Latency"
          value={isLoading ? "..." : (analyticsData?.averageLatency || "0ms")}
          metric="latency"
          chartData={analyticsData?.chartData?.map((item) => ({ ...item, value: Math.round(item.latency || 0) })) || []}
          isLoading={isLoading}
          chartType="line"
          subtitle=""
        />
      </div>

      {/* Advanced Analytics Charts */}
      {!isLoading && (
        <>
          

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DisconnectionReasonChart
              data={analyticsData?.disconnectionData || {}}
              agent={getAgentDisplay()}
              aggregatedData={true}
            />
            <UserSentimentChart
              data={analyticsData?.callAnalytics?.sentiments || {}}
              agent={getAgentDisplay()}
              aggregatedData={true}
            />
            <CallDirectionChart
              data={analyticsData?.directionData || {}}
              agent={getAgentDisplay()}
              aggregatedData={true}
            />
            <CallSuccessChart
              data={analyticsData?.callSuccessData || {}}
              agent={getAgentDisplay()}
              aggregatedData={true}
            />
          </div>
        </>
      )}

      {/* Add Custom Chart Modal */}
      {showAddChart && (
        <AddCustomChart
          onSave={handleAddChart}
          onCancel={() => setShowAddChart(false)}
          availableAgents={analyticsData?.agents || []}
          analyticsData={analyticsData || {}}
        />
      )}

      {/* Custom Charts Section */}
      {customCharts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Custom Charts</h3>
          <div className={`grid ${getGridClasses()} gap-6`}>
            {customCharts.map((chart) => (
              <div key={chart.id} className="relative">
                
                <CustomChart
                  data={chart.data}
                  title={chart.title}
                  chartType={chart.type as any}
                  agent={chart.agent}
                  metric={chart.metric}
                  size={chart.size as any}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}