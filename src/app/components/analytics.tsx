"use client"

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
  const [dateRange, setDateRange] = useState("All time")
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>()
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agent_a3f5d1a7dd6d0abe1ded29a1fc")
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

  // Add router to the component
  const router = useRouter()

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

      const params = new URLSearchParams()

      // Add date range parameters if selected
      if (selectedDateRange?.from && selectedDateRange?.to) {
        // Convert to ISO date strings for better handling
        const fromDate = selectedDateRange.from.toISOString().split("T")[0]
        const toDate = selectedDateRange.to.toISOString().split("T")[0]

        params.append("start_date", fromDate)
        params.append("end_date", toDate)

        // Also add timestamp format for backward compatibility
        const fromTimestamp = selectedDateRange.from.getTime()
        const toTimestamp = selectedDateRange.to.getTime() + (24 * 60 * 60 * 1000 - 1)

        params.append("from_timestamp", fromTimestamp.toString())
        params.append("to_timestamp", toTimestamp.toString())
      }

      // Add agent_id parameter
      if (selectedAgentId && selectedAgentId !== "all") {
        params.append("agent_id", selectedAgentId)
      }

      const url = `/api/calls/analytics${params.toString() ? `?${params.toString()}` : ""}`
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setAnalyticsData({
          ...analyticsData,
          apiStatus: "error",
        })
      } else {
        setAnalyticsData(data)
       

        if (data.apiStatus === "error") {
          setError("Failed to connect to Retell AI API - Please check your API key")
        } else if (data.totalCalls === 0) {
          setError("No call data found for the selected period")
        }
      }
    } catch (error) {
     
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
      return `Agent: Orasurge Outbound V2`
    }

    const agent = analyticsData.agents?.[0]
    if (!agent || agent === "No agents found") return "No agent"
    return `Agent: ${agent.substring(0, 8)}...`
  }

  const getGridClasses = () => {
    if (customCharts.length === 0) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"

    const hasLarge = customCharts.some((chart) => chart.size === "Large")
    if (hasLarge) {
      return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    }
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
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
       
           <h1> Orasurge Outbound V2</h1>
                  
               
          
        </div>
      </div>

      {/* Default Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Call Counts"

          value={isLoading ? "..." : analyticsData.totalCalls.toString()}
          metric="calls"
          chartData={analyticsData.chartData.map((item) => ({ ...item, value: item.calls || 0 }))}
          isLoading={isLoading}
          chartType="line" subtitle={""}        />
        <MetricCard
          title="Call Duration"

          value={isLoading ? "..." : analyticsData.averageDuration}
          metric="duration"
          chartData={analyticsData.chartData.map((item) => ({ ...item, value: item.duration || 0 }))}
          isLoading={isLoading}
          chartType="line" subtitle={""}        />
        <MetricCard
          title="Call Latency"

          value={isLoading ? "..." : analyticsData.averageLatency}
          metric="latency"
          chartData={analyticsData.chartData.map((item) => ({ ...item, value: Math.round(item.latency || 0) }))}
          isLoading={isLoading}
          chartType="line" subtitle={""}        />
      </div>

      {/* Advanced Analytics Charts */}
      {!isLoading && (
        <>
          

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DisconnectionReasonChart
              data={analyticsData.rawCalls}
              agent={getAgentDisplay()}
              
            />
            <UserSentimentChart data={analyticsData.rawCalls} agent={getAgentDisplay()} />
            <CallDirectionChart data={analyticsData.rawCalls} agent={getAgentDisplay()}  />
            <CallSuccessChart data={analyticsData.rawCalls} agent={getAgentDisplay()}/>
           
          </div>
        </>
      )}

      {/* Add Custom Chart Modal */}
      {showAddChart && (
        <AddCustomChart
          onSave={handleAddChart}
          onCancel={() => setShowAddChart(false)}
          availableAgents={analyticsData.agents}
          analyticsData={analyticsData}
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
