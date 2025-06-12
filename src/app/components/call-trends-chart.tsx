"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Expand } from "lucide-react"
import Link from "next/link"

interface CallTrendsChartProps {
  data?: any[]
  calls?: any[]
  title?: string
  agent?: string
  dateRange?: { from: Date; to: Date } | undefined
}

export function CallTrendsChart({
  data = [],
  calls = [],
  title = "Call Counts",
  agent = "All agents",
  dateRange,
}: CallTrendsChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDetailedView, setShowDetailedView] = useState(false)

  // Filter and format data for area chart based on date range
  const chartData = useMemo(() => {
    // If we have calls data instead of formatted data, process it
    if (calls && calls.length > 0 && (!data || data.length === 0)) {
      // Group calls by date
      const callsByDate: Record<string, number> = {};
      
      calls.forEach((call: any) => {
        if (call.start_timestamp) {
          const date = new Date(call.start_timestamp).toDateString();
          callsByDate[date] = (callsByDate[date] || 0) + 1;
        }
      });

      // Convert to chart format
      return Object.entries(callsByDate).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: count,
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Use provided data if available
    let filteredData = data || [];

    if (dateRange?.from && dateRange?.to && filteredData.length > 0) {
      const fromTime = dateRange.from.getTime()
      const toTime = dateRange.to.getTime() + (24 * 60 * 60 * 1000 - 1)

      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.date).getTime()
        return itemDate >= fromTime && itemDate <= toTime
      })
    }

    // Safety check to prevent undefined error
    if (!filteredData || !Array.isArray(filteredData)) {
      return [];
    }

    return filteredData.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: item.calls,
    }))
  }, [data, calls, dateRange])

  return (
    <Card className="w-full group">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
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
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-3 h-3 bg-[#8884d8] rounded mr-2"></div>
            Call counts
          </div>
        </div>
      </CardContent>
      {/* Detailed View Dialog */}
      <Dialog open={showDetailedView} onOpenChange={setShowDetailedView}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{title} - Detailed View</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            

            {/* Larger chart */}
            <div className="h-[400px] bg-white border rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValueDetailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorValueDetailed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Metrics table */}
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Call Count
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {chartData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Button variant="link" size="sm" className="text-blue-600 hover:text-blue-800 p-0" asChild>
                            <Link className="text-sm font-medium  text-[#1F4280]" href="/call-history">Call History</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
