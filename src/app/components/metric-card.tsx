"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Expand, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface MetricCardProps {
  title: string
  subtitle: string
  value: string
  metric: string
  isLoading?: boolean
  chartType?: string
  chartData?: any[]
  size?: string
  isCustom?: boolean
  onDelete?: () => void
  viewBy?: string
  dateRange?: { from: Date; to: Date }
  filterByDateRange?: boolean
  onViewDetails?: () => void
}

export function MetricCard({
  title,
 
  value,
  metric,
  isLoading = false,
  chartType = "line",
  chartData = [],
  size = "Medium",
  isCustom = false,
  onDelete,
  viewBy = "Day",
  dateRange,
  filterByDateRange,
  onViewDetails,
}: MetricCardProps) {
  const [showChart, setShowChart] = useState(false)

  const getCardClasses = () => {
    const baseClasses = "group hover:shadow-md transition-shadow"
    switch (size) {
      case "Small":
        return `${baseClasses} col-span-1`
      case "Large":
        return `${baseClasses} col-span-1 md:col-span-2 lg:col-span-3`
      default: // Medium
        return `${baseClasses} col-span-1`
    }
  }

  const getChartHeight = () => {
    switch (size) {
      case "Small":
        return 120
      case "Large":
        return 250
      default: // Medium
        return 180
    }
  }

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316"]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            {payload[0].value} {metric}
          </p>
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    switch (chartType) {
      case "line":
        return (
          <LineChart width={400} height={getChartHeight()} data={chartData}>
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
            <XAxis dataKey="name" />
            <YAxis />
            <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
            <Tooltip content={<CustomTooltip />} />
          </LineChart>
        )
      case "bar":
        return (
          <BarChart width={400} height={getChartHeight()} data={chartData}>
            <Bar dataKey="value" fill="#8884d8" />
            <XAxis dataKey="name" />
            <YAxis />
            <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
            <Tooltip content={<CustomTooltip />} />
          </BarChart>
        )
      case "pie":
        return (
          <PieChart width={400} height={getChartHeight()}>
            <Pie
              data={chartData}
              cx={200}
              cy={100}
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8" dataKey={""}            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        )
      default:
        return null
    }
  }

  return (
    <Card className={getCardClasses()}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
       
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div>
          
            <p className="text-2xl font-bold">
              {value} {metric}
            </p>
          </div>

        </div>
        {showChart && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart() || <div>No chart data available</div>}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
