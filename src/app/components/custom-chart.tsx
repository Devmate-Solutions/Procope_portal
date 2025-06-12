"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { BarChart3, PieChartIcon, LineChartIcon as LineIcon, BarChart2, Hash, TrendingUp, Expand } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface CustomChartProps {
  data: any[]
  title: string
  chartType: "Column" | "Bar" | "Donut" | "Line" | "Number"
  agent?: string
  metric?: string
  size?: "Small" | "Medium" | "Large"
  dateRange?: { from: Date; to: Date }
  filterByDateRange?: boolean
}

export function CustomChart({
  data,
  title,
  chartType,
  agent = "Orasurge Outbound V2",
  metric = "calls",
  size = "Medium",
  dateRange,
  filterByDateRange = false,
}: CustomChartProps) {
  const [showDetailedView, setShowDetailedView] = useState(false)
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null)

  const filteredData = useMemo(() => {
    if (!filterByDateRange || !dateRange?.from || !dateRange?.to) {
      return data
    }

    const fromTime = dateRange.from.getTime()
    const toTime = dateRange.to.getTime() + (24 * 60 * 60 * 1000 - 1)

    return data.filter((item) => {
      if (!item.fullDate) return true // Keep items without date info
      const itemTime = new Date(item.fullDate).getTime()
      return itemTime >= fromTime && itemTime <= toTime
    })
  }, [data, dateRange, filterByDateRange])

  // Get the correct icon based on chart type
  const ChartIcon = () => {
    switch (chartType) {
      case "Column":
        return <BarChart3 className="h-4 w-4 mr-2" />
      case "Bar":
        return <BarChart2 className="h-4 w-4 mr-2" />
      case "Donut":
        return <PieChartIcon className="h-4 w-4 mr-2" />
      case "Line":
        return <LineIcon className="h-4 w-4 mr-2" />
      case "Number":
        return <Hash className="h-4 w-4 mr-2" />
    }
  }

  // Get the height based on size
  const getHeight = () => {
    switch (size) {
      case "Small":
        return 200
      case "Medium":
        return 300
      case "Large":
        return 400
      default:
        return 300
    }
  }

  // For Number chart type - calculate the total or average
  const calculateNumberValue = () => {
    if (!filteredData || filteredData.length === 0) return 0

    // Calculate different values based on metric type
    switch (metric) {
      case "calls":
        // For call counts, sum all values to get the total number of calls
        return filteredData.reduce((total, item) => total + item.value, 0)

      case "seconds":
        // For call duration, get the average duration
        const sum = filteredData.reduce((total, item) => total + item.value, 0)
        return Math.round(sum / filteredData.length)

      case "ms":
        // For latency, get the average
        const latencySum = filteredData.reduce((total, item) => total + item.value, 0)
        return Math.round(latencySum / filteredData.length)

      case "%":
        // For percentages like success rate, get the most recent value
        return filteredData[filteredData.length - 1]?.value || 0

      case "score":
        // For sentiment score, get the average
        const scoreSum = filteredData.reduce((total, item) => total + item.value, 0)
        return Math.round(scoreSum / filteredData.length)

      default:
        // Default to sum for call counts
        return filteredData.reduce((total, item) => total + item.value, 0)
    }
  }

  // Enhanced tooltip to capture click events
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]
      return (
        <div 
          className="bg-white p-2 border rounded shadow cursor-pointer hover:bg-gray-50"
          onClick={() => setSelectedDataPoint({
            label: label,
            value: dataPoint.value,
            fullDetails: payload[0]
          })}
        >
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            {dataPoint.value} {metric}
          </p>
          <p className="text-xs text-gray-500 mt-1">Click for details</p>
        </div>
      )
    }
    return null
  }

  // For Donut/Pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize="12">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Convert data for pie chart if needed
  const getPieChartData = () => {
    if (!filteredData || filteredData.length === 0) {
      return [{ name: "No Data", value: 1, color: "#94a3b8" }]
    }

    return filteredData.map((item, index) => ({
      name: item.date,
      value: item.value,
      color: getColorByIndex(index),
    }))
  }

  // Get color by index
  const getColorByIndex = (index: number) => {
    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", "#00C49F", "#FFBB28", "#FF8042"]
    return colors[index % colors.length]
  }

  // Calculate trend for Number chart
  const getTrendInfo = () => {
    if (!filteredData || filteredData.length < 2) return { change: 0, isPositive: true }

    const latest = filteredData[filteredData.length - 1]?.value || 0
    const previous = filteredData[filteredData.length - 2]?.value || 0

    if (previous === 0) return { change: 0, isPositive: true }

    const change = ((latest - previous) / previous) * 100
    return { change: Math.abs(change), isPositive: change >= 0 }
  }

  // Render different chart types
  const renderChart = () => {
    // Handle empty data case
    if (!filteredData || filteredData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">No data available for selected date range</div>
        </div>
      )
    }

    switch (chartType) {
      case "Number":
        const numberValue = calculateNumberValue()
        const trendInfo = getTrendInfo()
        let numberLabel = ""

        // Set appropriate labels based on metric
        switch (metric) {
          case "calls":
            numberLabel = "Total Calls"
            break
          case "seconds":
            numberLabel = "Avg. Duration"
            break
          case "ms":
            numberLabel = "Avg. Latency"
            break
          case "%":
            numberLabel = "Success Rate"
            break
          case "score":
            numberLabel = "Sentiment Score"
            break
          default:
            numberLabel = "Total"
        }

        return (
          <div className="flex items-center justify-center  h-full">
            <div className="text-center">
              <div className="text-4xl font-bold">{numberValue}</div>
              <div className="text-gray-500 mt-2">{numberLabel}</div>
              {filteredData && filteredData.length > 1 && (
                <div
                  className={`flex items-center justify-center mt-2 text-sm ${trendInfo.isPositive ? "text-green-600" : "text-red-600"}`}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {trendInfo.isPositive ? "+" : "-"}
                  {trendInfo.change.toFixed(1)}%
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {filteredData ? filteredData.length : 0} data points
                {dateRange && (
                  <span className="block">
                    {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )

      case "Column":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#8884d8" 
                onClick={(data, index) => setSelectedDataPoint({
                  label: data.date,
                  value: data.value,
                  fullDetails: filteredData[index]
                })}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case "Bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={filteredData} margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, "auto"]} />
              <YAxis dataKey="date" type="category" width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        )

      case "Line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        )

      case "Donut":
        const pieData = getPieChartData()
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={(props) => {
                  const { active, payload } = props || {}
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-2 border rounded shadow">
                        <p className="font-medium">{payload[0].name}</p>
                        <p className="text-sm">
                          {payload[0].value} {metric}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Unsupported chart type</div>
          </div>
        )
    }
  }

  return (
    <Card className="w-full group">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
          <div className="flex items-center">
            <ChartIcon />
            <span>{title}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowDetailedView(true)}
          >
            <Expand className="h-3 w-3" />
            <span className="sr-only">Expand</span>
          </Button>
        </CardTitle>
        <p className="text-xs text-gray-500">
        Orasurge Outbound V2 • Metric: {metric}
        </p>
        {filterByDateRange && dateRange && (
          <p className="text-xs text-gray-400">
            Filtered: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height: getHeight() }}>{renderChart()}</div>
      </CardContent>

      {/* Detailed View Dialog */}
      <Dialog open={showDetailedView} onOpenChange={setShowDetailedView}>
        <DialogContent className="max-w-[95vw] lg:max-w-[90vw] xl:max-w-[98vw] h-[95vh] overflow-hidden p-0">
          <div className="grid grid-cols-12 gap-0 h-full">
            {/* Narrow Sidebar with Chart Details */}
            <div className="col-span-3 bg-gray-50 border-r p-6 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <ChartIcon />
                  <h2 className="text-2xl font-bold text-gray-900 truncate">{title}</h2>
                </div>
                
                <div className="bg-white border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Metric</span>
                    <span className="text-sm font-medium truncate ml-2">{metric}</span>
                  </div>
             
                  {dateRange && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Date Range</span>
                      <span className="text-sm font-medium truncate ml-2">
                        {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Point Details */}
              <div className="bg-white border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  {selectedDataPoint ? selectedDataPoint.label : "Select a Data Point"}
                </h3>
                
                {selectedDataPoint ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Value</span>
                      <span className="text-xl font-bold text-primary">
                        {selectedDataPoint.value} {metric}
                      </span>
                    </div>
                    
                    {selectedDataPoint.fullDetails && (
                      <div className="bg-gray-50 border rounded p-3">
                        <h5 className="text-xs font-medium text-gray-500 mb-2">Additional Details</h5>
                        <pre className="text-xs text-gray-700 overflow-x-auto max-h-40">
                          {JSON.stringify(selectedDataPoint.fullDetails, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p>Click on a data point in the chart to see details</p>
                  </div>
                )}
              </div>

              {/* Comparative Analysis */}
              {filteredData && filteredData.length > 1 && (
                <div className="bg-white border rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Comparative Analysis
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Minimum</p>
                      <p className="text-md font-bold text-gray-700">
                        {Math.min(...filteredData.map(d => d.value))} {metric}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Maximum</p>
                      <p className="text-md font-bold text-gray-700">
                        {Math.max(...filteredData.map(d => d.value))} {metric}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Average</p>
                      <p className="text-md font-bold text-gray-700">
                        {Math.round(filteredData.reduce((a, b) => a + b.value, 0) / filteredData.length)} {metric}
                      </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500  font-medium mb-1">Call History</p>
                      <p className="text-md font-bold text-gray-700">
                        <Link href={'/call-history'} className=" text-sm  text-[#1F4280]">Call History</Link>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Expanded Main Chart Area */}
            <div className="col-span-9 p-6 bg-white overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="mr-3 h-7 w-7 text-primary">
                      {ChartIcon()}
                    </span>
                    {title} Visualization
                  </h3>
                  <div className="text-sm text-gray-600 flex items-center space-x-3">
                    <span>{filteredData ? filteredData.length : 0} data points</span>
                    <div className="h-4 w-px bg-gray-300 mx-2"></div>
                    <span className="text-xs text-gray-500">
                      {chartType} Chart • {metric}
                    </span>
                  </div>
                </div>
                
                <div className="flex-grow border-2 border-primary/10 rounded-xl shadow-sm overflow-hidden">
                  <div style={{ height: '100%', minHeight: '600px' }}>
                    {renderChart()}
                  </div>
                </div>

                {/* Additional Context or Annotations */}
                <div className="mt-4 bg-gray-50 border rounded-lg p-4 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold">Insights:</span> 
                    This visualization represents {title} over the selected date range, 
                    providing a comprehensive view of the data trends and patterns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
