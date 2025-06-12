"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3, BarChart, PieChart, TrendingUp, Hash, Plus } from "lucide-react"
import { DateRangePicker } from "./date-range-picker"
import { CustomChart } from "./custom-chart"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"

interface AddCustomChartProps {
  onSave: (config: any) => void
  onCancel: () => void
  availableAgents: string[]
  analyticsData: any
}

const FIXED_AGENT_ID = "agent_a3f5d1a7dd6d0abe1ded29a1fc"
const FIXED_AGENT_NAME = "Orasurge Outbound V2"

export function AddCustomChart({ onSave, onCancel, availableAgents, analyticsData }: AddCustomChartProps) {
  const [graphType, setGraphType] = useState("column")
  const [dateRange, setDateRange] = useState("Last 4 weeks")
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>()
  const [compareToPrevious, setCompareToPrevious] = useState(false)
  const [metrics, setMetrics] = useState([{ agent: FIXED_AGENT_ID, metric: "Call Counts" }])
  const [viewBy, setViewBy] = useState("Day")
  const [size, setSize] = useState("Medium")
  const [previewData, setPreviewData] = useState<any[]>([])

  const graphTypes = [
    { id: "column", label: "Column", icon: BarChart3 },
    { id: "bar", label: "Bar", icon: BarChart },
    { id: "donut", label: "Donut", icon: PieChart },
    { id: "line", label: "Line", icon: TrendingUp },
    { id: "number", label: "Number", icon: Hash },
  ]

  const metricOptions = [
    "Call Counts",
    "Call Duration",
    "Call Latency",
    "Success Rate",
    "User Sentiment",
    "Disconnection Reason",
  ]
  const viewByOptions = ["Hour", "Day", "Week", "Month"]
  const sizeOptions = ["Small", "Medium", "Large"]

  // Initialize default date range
  useEffect(() => {
    if (!selectedDateRange) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const fourWeeksAgo = new Date(today)
      fourWeeksAgo.setDate(today.getDate() - 28)
      setSelectedDateRange({ from: fourWeeksAgo, to: today })
    }
  }, [])

  useEffect(() => {
    generateRealPreviewData()
  }, [metrics, graphType, analyticsData, viewBy, dateRange, selectedDateRange])

  const handleDateRangeChange = (value: string, range?: DateRange) => {
    setDateRange(value)
    setSelectedDateRange(range)
  }

  const generateRealPreviewData = () => {
    if (!analyticsData || !analyticsData.rawCalls || analyticsData.rawCalls.length === 0) {
      const sampleData = generateSampleData()
      setPreviewData(sampleData)
      return
    }

    // Filter calls by date range if provided
    let filteredCalls = analyticsData.rawCalls.filter((call: any) => call.agent_id === FIXED_AGENT_ID)

    if (selectedDateRange?.from && selectedDateRange?.to) {
      const fromTime = selectedDateRange.from.getTime()
      const toTime = selectedDateRange.to.getTime() + (24 * 60 * 60 * 1000 - 1)

      filteredCalls = filteredCalls.filter((call: any) => {
        if (!call.start_timestamp) return false
        const callTime = new Date(call.start_timestamp).getTime()
        return callTime >= fromTime && callTime <= toTime
      })
    }

    if (filteredCalls.length === 0) {
      setPreviewData(generateSampleData())
      return
    }

    const metric = metrics[0]?.metric || "Call Counts"

    // Group calls by date according to viewBy
    const groupedCalls = groupCallsByDate(filteredCalls, viewBy)

    // Transform data based on metric for the specific agent
    const transformedData = Object.entries(groupedCalls).map(([dateKey, calls]: [string, any[]]) => {
      let value = 0
      let label = ""

      switch (metric) {
        case "Call Counts":
          value = calls.length
          label = "calls"
          break
        case "Call Duration":
          const totalDuration = calls.reduce((sum: number, call: any) => sum + (call.duration_ms || 0), 0)
          value = calls.length ? Math.round(totalDuration / calls.length / 1000) : 0
          label = "seconds"
          break
        case "Call Latency":
          const latencies = calls
            .map((call: any) => call.latency?.e2e?.p50 || call.latency?.e2e?.avg || 0)
            .filter((l: number) => l > 0)
          value =
            latencies.length > 0
              ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
              : 0
          label = "ms"
          break
        case "Success Rate":
          const successful = calls.filter((call: any) => call.call_analysis?.call_successful).length
          value = calls.length ? Math.round((successful / calls.length) * 100) : 0
          label = "%"
          break
        case "User Sentiment":
          value = calculateSentimentFromCalls(calls)
          label = "score"
          break
        case "Disconnection Reason":
          value = calls.length
          label = "calls"
          break
        default:
          value = calls.length
          label = "calls"
      }

      return {
        date: formatDateKey(dateKey, viewBy),
        value: value,
        label: label, // This should be the correct metric label (calls, seconds, ms, %, score)
        fullDate: dateKey,
      }
    })

    // Sort by date
    transformedData.sort((a, b) => {
      return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    })

    setPreviewData(transformedData)
  }

  const generateSampleData = () => {
    const data = []
    const metric = metrics[0]?.metric || "Call Counts"

    // Use selected date range or default to 15 days
    const endDate = selectedDateRange?.to || new Date()
    const startDate = selectedDateRange?.from || new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysToShow = Math.min(daysDiff, 30) // Limit to 30 days for preview

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateStr = date.toISOString().split("T")[0]

      let value = 0
      let label = ""

      switch (metric) {
        case "Call Counts":
          value = Math.floor(Math.random() * 50) + 10
          label = "calls"
          break
        case "Call Duration":
          value = Math.floor(Math.random() * 300) + 60
          label = "seconds"
          break
        case "Call Latency":
          value = Math.floor(Math.random() * 200) + 50
          label = "ms"
          break
        case "Success Rate":
          value = Math.floor(Math.random() * 30) + 70
          label = "%"
          break
        case "User Sentiment":
          value = Math.floor(Math.random() * 40) + 60
          label = "score"
          break
        default:
          value = Math.floor(Math.random() * 50) + 10
          label = "calls"
      }

      data.push({
        date: formatSampleDate(dateStr, viewBy),
        value,
        label,
        fullDate: dateStr,
      })
    }

    return data
  }

  const formatSampleDate = (dateStr: string, viewBy: string) => {
    const d = new Date(dateStr)
    switch (viewBy) {
      case "Hour":
        return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      case "Week":
        return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      case "Month":
        return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      default:
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
  }

  const groupCallsByDate = (calls: any[], viewBy: string) => {
    const groupedCalls: Record<string, any[]> = {}

    calls.forEach((call: any) => {
      if (!call.start_timestamp) return

      const callDate = new Date(call.start_timestamp)
      let dateKey: string

      switch (viewBy) {
        case "Hour":
          dateKey = `${callDate.getFullYear()}-${String(callDate.getMonth() + 1).padStart(2, "0")}-${String(
            callDate.getDate(),
          ).padStart(2, "0")}-${String(callDate.getHours()).padStart(2, "0")}`
          break
        case "Week":
          const startOfWeek = new Date(callDate)
          startOfWeek.setDate(callDate.getDate() - callDate.getDay())
          dateKey = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(
            startOfWeek.getDate(),
          ).padStart(2, "0")}`
          break
        case "Month":
          dateKey = `${callDate.getFullYear()}-${String(callDate.getMonth() + 1).padStart(2, "0")}`
          break
        default:
          dateKey = `${callDate.getFullYear()}-${String(callDate.getMonth() + 1).padStart(2, "0")}-${String(
            callDate.getDate(),
          ).padStart(2, "0")}`
          break
      }

      if (!groupedCalls[dateKey]) {
        groupedCalls[dateKey] = []
      }

      groupedCalls[dateKey].push(call)
    })

    return groupedCalls
  }

  const formatDateKey = (dateKey: string, viewBy: string) => {
    switch (viewBy) {
      case "Hour":
        const hour = dateKey.split("-")[3]
        return `${hour}:00`
      case "Week":
        const [year, month, day] = dateKey.split("-")
        return `Week of ${month}/${day}`
      case "Month":
        const [yearM, monthM] = dateKey.split("-")
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return `${monthNames[Number.parseInt(monthM) - 1]} ${yearM}`
      default:
        const [yearD, monthD, dayD] = dateKey.split("-")
        return `${monthD}/${dayD}`
    }
  }

  const calculateSentimentFromCalls = (calls: any[]) => {
    if (calls.length === 0) return 50

    const sentimentScores = calls
      .filter((call: any) => call.call_analysis?.user_sentiment)
      .map((call: any) => {
        switch (call.call_analysis.user_sentiment) {
          case "Positive":
            return 100
          case "Neutral":
            return 50
          case "Negative":
            return 0
          default:
            return 50
        }
      })

    return sentimentScores.length > 0
      ? Math.round(sentimentScores.reduce((a: number, b: number) => a + b, 0) / sentimentScores.length)
      : 50
  }

  const addMetric = () => {
    setMetrics([...metrics, { agent: FIXED_AGENT_ID, metric: "Call Counts" }])
  }

  const updateMetric = (index: number, field: string, value: string) => {
    const updated = [...metrics]
    updated[index] = { ...updated[index], [field]: value }
    setMetrics(updated)
  }

  const handleSave = () => {
    const selectedMetric = metrics[0]?.metric || "Call Counts"

    // Map metric names to proper labels
    const metricLabelMap: Record<string, string> = {
      "Call Counts": "calls",
      "Call Duration": "seconds",
      "Call Latency": "ms",
      "Success Rate": "%",
      "User Sentiment": "score",
      "Disconnection Reason": "calls",
    }

    const config = {
      graphType: graphType,
      dateRange,
      selectedDateRange,
      compareToPrevious,
      metrics,
      viewBy,
      size,
      metric: selectedMetric,
      agent: FIXED_AGENT_NAME,
      previewData,
      chartType: getChartType(graphType),
      label: metricLabelMap[selectedMetric] || "calls", // Use proper metric label
      title: selectedMetric,
      // Save configuration for future filtering
      savedConfig: {
        dateRangeType: dateRange,
        dateRangeObject: selectedDateRange,
        filterByDateRange: true,
        metricType: selectedMetric,
        metricLabel: metricLabelMap[selectedMetric] || "calls",
      },
    }
    onSave(config)
  }

  const getChartType = (type: string): "Column" | "Bar" | "Donut" | "Line" | "Number" => {
    switch (type) {
      case "column":
        return "Column"
      case "bar":
        return "Bar"
      case "donut":
        return "Donut"
      case "line":
        return "Line"
      case "number":
        return "Number"
      default:
        return "Column"
    }
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-[95vw] lg:max-w-[90vw] max-h-[90vh] overflow-y-auto p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          {/* Configuration Sidebar */}
          <div className="col-span-1 bg-gray-50 border-r p-6 space-y-6 overflow-y-auto">
            <div className="space-y-2">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <Plus className="h-6 w-6 mr-3 text-primary" />
                  Create Custom Chart
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  Design a personalized analytics visualization
                </p>
              </DialogHeader>
            </div>

            {/* Graph Type */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Graph Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {graphTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all 
                      ${graphType === type.id 
                        ? "bg-primary/10 border-2 border-primary text-primary" 
                        : "bg-white border hover:bg-gray-100"}`}
                    onClick={() => setGraphType(type.id)}
                  >
                    <type.icon className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Date Range</Label>
              <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
              <p className="text-xs text-gray-500 mt-2">
                {selectedDateRange?.from && selectedDateRange?.to
                  ? `${selectedDateRange.from.toLocaleDateString()} - ${selectedDateRange.to.toLocaleDateString()}`
                  : "Select a date range"}
              </p>
            </div>

            {/* Comparison Toggle */}
            <div className="flex items-center justify-between bg-white border rounded-lg p-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Compare to Previous Period</Label>
                <p className="text-xs text-gray-500">Show trend and changes</p>
              </div>
              <Switch 
                checked={compareToPrevious} 
                onCheckedChange={setCompareToPrevious} 
                className="ml-4"
              />
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold text-gray-700">Metrics</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={addMetric}
                  className="text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metric
                </Button>
              </div>
              <div className="space-y-3">
                {metrics.map((metric, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-2 gap-3 bg-white border rounded-lg p-3"
                  >
                    <div className="bg-gray-50 border rounded p-2">
                      <p className="text-xs text-gray-600">Agent</p>
                      <p className="text-sm font-medium">
                        {FIXED_AGENT_NAME}
                      </p>
                    </div>
                    <Select 
                      value={metric.metric} 
                      onValueChange={(value) => updateMetric(index, "metric", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {metricOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* View By and Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">View By</Label>
                <div className="grid grid-cols-2 gap-2">
                  {viewByOptions.map((option) => (
                    <Button
                      key={option}
                      variant={viewBy === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewBy(option)}
                      className="w-full"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Size</Label>
                <div className="grid grid-cols-3 gap-2">
                  {sizeOptions.map((option) => (
                    <Button
                      key={option}
                      variant={size === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSize(option)}
                      className="w-full"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="col-span-1 lg:col-span-2 p-6 bg-white overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-primary" />
                  Chart Preview
                </h3>
                <div className="text-sm text-gray-600">
                  {previewData.length} data points
                </div>
              </div>

              <Card className="border-2 border-primary/10 shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-2 mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">
                          {metrics[0]?.metric || "Call Counts"}
                        </h4>
                       
                        <p className="text-xs text-gray-500">
                          {dateRange}
                          {selectedDateRange?.from && selectedDateRange?.to && (
                            <span className="ml-2">
                              ({selectedDateRange.from.toLocaleDateString()} - {selectedDateRange.to.toLocaleDateString()})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <CustomChart
                          data={previewData}
                          title={metrics[0]?.metric || "Call Counts"}
                          chartType={getChartType(graphType)}
                        
                          metric={previewData[0]?.label || "calls"}
                          size={size as any}
                        />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <h4 className="text-md font-semibold text-gray-700">Chart Configuration</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border rounded p-3">
                          <p className="text-xs text-gray-500">Graph Type</p>
                          <p className="text-sm font-medium">{graphTypes.find(t => t.id === graphType)?.label}</p>
                        </div>
                        <div className="bg-white border rounded p-3">
                          <p className="text-xs text-gray-500">Metric</p>
                          <p className="text-sm font-medium">{metrics[0]?.metric}</p>
                        </div>
                        <div className="bg-white border rounded p-3">
                          <p className="text-xs text-gray-500">View By</p>
                          <p className="text-sm font-medium">{viewBy}</p>
                        </div>
                        <div className="bg-white border rounded p-3">
                          <p className="text-xs text-gray-500">Size</p>
                          <p className="text-sm font-medium">{size}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end space-x-3">
          <Button 
            variant="outline" 
            size="default"
            onClick={onCancel}
            className="px-6"
          >
            Cancel
          </Button>
          <Button 
            variant="default"
            size="default"
            onClick={handleSave}
            className="px-6"
          >
            Save Chart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
