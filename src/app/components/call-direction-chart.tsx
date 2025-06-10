"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { PhoneCall } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Expand } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

interface CallDirectionChartProps {
  data: any[] | any
  title?: string
  agent?: string
  dateRange?: { from: Date; to: Date } | undefined
  aggregatedData?: boolean
}

export function CallDirectionChart({
  data,
  title = "Phone inbound/outbound",
  agent = "All agents",
  dateRange,
  aggregatedData = false,
}: CallDirectionChartProps) {
  const [showDetailedView, setShowDetailedView] = useState(false)
  const calculateDirectionDistribution = () => {
    // Handle aggregated data from analytics API
    if (aggregatedData && typeof data === 'object' && !Array.isArray(data)) {
      const result = [];

      if (data.inbound > 0) {
        result.push({ name: "Inbound", value: data.inbound, color: "#60a5fa" });
      }
      if (data.outbound > 0) {
        result.push({ name: "Outbound", value: data.outbound, color: "#f97316" });
      }
      if (data.unknown > 0) {
        result.push({ name: "Unknown", value: data.unknown, color: "#94a3b8" });
      }

      return result.length > 0 ? result : [{ name: "No Data", value: 1, color: "#94a3b8" }];
    }

    // Handle individual call data (original logic)
    let filteredData = Array.isArray(data) ? data : [];

    // Filter by date range if provided
    if (dateRange?.from && dateRange?.to) {
      const fromTime = dateRange.from.getTime()
      const toTime = dateRange.to.getTime() + (24 * 60 * 60 * 1000 - 1)

      filteredData = filteredData.filter((call) => {
        if (!call.start_timestamp) return false
        const callTime = new Date(call.start_timestamp).getTime()
        return callTime >= fromTime && callTime <= toTime
      })
    }

    if (!filteredData || filteredData.length === 0) {
      return [{ name: "No Data", value: 1, color: "#94a3b8" }]
    }

    let inbound = 0
    let outbound = 0
    let webCall = 0

    filteredData.forEach((call) => {
      if (call.call_type === "web_call") {
        webCall++
      } else if (call.direction === "inbound") {
        inbound++
      } else if (call.direction === "outbound") {
        outbound++
      } else {
        // Default assumption for phone calls without direction
        inbound++
      }
    })

    // If no real data, generate sample distribution
    if (inbound === 0 && outbound === 0 && webCall === 0) {
      const total = filteredData.length
      inbound = Math.floor(total * 0.65)
      outbound = Math.floor(total * 0.25)
      webCall = total - inbound - outbound
    }

    const result = []
    if (inbound > 0) result.push({ name: "Inbound", value: inbound, color: "#60a5fa" })
    if (outbound > 0) result.push({ name: "Outbound", value: outbound, color: "#f97316" })
    if (webCall > 0) result.push({ name: "Web Call", value: webCall, color: "#10b981" })

    return result.length > 0 ? result : [{ name: "No Data", value: 1, color: "#94a3b8" }]
  }

  const chartData = calculateDirectionDistribution()

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{data.value} calls</p>
        </div>
      )
    }
    return null
  }

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

  return (
    <Card className="w-full group">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
          <div className="flex items-center">
            <PhoneCall className="h-4 w-4 mr-2" />
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
        <p className="text-xs text-gray-500">{agent}</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      {/* Detailed View Dialog */}
      <Dialog open={showDetailedView} onOpenChange={setShowDetailedView}>
        <DialogContent className="max-w-[95vw] lg:max-w-[90vw] xl:max-w-[98vw] h-[95vh] overflow-hidden p-0">
          <div className="grid grid-cols-12 gap-0 h-full">
            {/* Narrow Sidebar with Chart Details */}
            <div className="col-span-3 bg-gray-50 border-r p-6 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <PhoneCall className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900 truncate">{title}</h2>
                </div>
                
                <div className="bg-white border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Metric</span>
                    <span className="text-sm font-medium truncate ml-2">Call Direction</span>
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

              {/* Call Direction Breakdown */}
              <div className="bg-white border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Call Direction Distribution
                </h3>
                
                <div className="space-y-3">
                  {chartData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{item.value}</span>
                        <span className="text-xs text-gray-500">calls</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={'/call-history'} className="text-sm font-medium  text-[#1F4280]">Call History</Link>
                        
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparative Analysis */}
              <div className="bg-white border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Call Direction Analysis
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Total Calls</p>
                    <p className="text-md font-bold text-gray-700">
                      {chartData.reduce((sum, item) => sum + item.value, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Dominant Direction</p>
                    <p className="text-md font-bold text-primary">
                      {chartData.length > 0 
                        ? chartData.reduce((max, item) => 
                            item.value > max.value ? item : max
                          ).name 
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Call Types</p>
                    <p className="text-md font-bold text-gray-700">
                      {chartData.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Main Chart Area */}
            <div className="col-span-9 p-6 bg-white overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                    <PhoneCall className="h-7 w-7 mr-3 text-primary" />
                    {title} Visualization
                  </h3>
                  <div className="text-sm text-gray-600 flex items-center space-x-3">
                    <span>{chartData.reduce((sum, item) => sum + item.value, 0)} total calls</span>
                    <div className="h-4 w-px bg-gray-300 mx-2"></div>
                    <span className="text-xs text-gray-500">
                      Pie Chart • Call Direction
                    </span>
                  </div>
                </div>
                
                <div className="flex-grow border-2 border-primary/10 rounded-xl shadow-sm overflow-hidden">
                  <div style={{ height: '100%', minHeight: '600px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={250}
                          innerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          labelLine={false}
                          label={renderCustomLabel}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Additional Context or Annotations */}
                <div className="mt-4 bg-gray-50 border rounded-lg p-4 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold">Insights:</span> 
                    This visualization breaks down call directions, 
                    highlighting the distribution of inbound, outbound, and web calls.
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
