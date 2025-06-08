"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { MoreHorizontal, Phone, Clock, User, RefreshCw, AlertCircle, Badge, Filter } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface Call {
  call_id: string
  agent_id: string
  call_type: string
  call_status: string
  start_timestamp: number
  end_timestamp?: number
  duration_ms?: number
  user_sentiment?: string
  from_number?: string
  to_number?: string
  recording_url?: string
  transcript?: string
}

export function CallsList() {
  const [calls, setCalls] = useState<Call[]>([])
  const [agents, setAgents] = useState<string[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agent_a3f5d1a7dd6d0abe1ded29a1fc")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchCalls()
  }, [selectedAgentId])

  const fetchCalls = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setIsRefreshing(true)

      // Add agent_id parameter if not "all"
      const params = new URLSearchParams()
      if (selectedAgentId && selectedAgentId !== "all") {
        params.append("agent_id", selectedAgentId)
      }

      const url = `/api/calls${params.toString() ? `?${params.toString()}` : ""}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setCalls([])
      } else {
        setCalls(data.calls || [])

        // Extract unique agent IDs
        const uniqueAgents = [...new Set(data.calls.map((call: Call) => call.agent_id).filter(Boolean))] as string[]
        setAgents(uniqueAgents)

        if (data.calls?.length === 0) {
          setError("No calls found")
        }
      }
    } catch (error) {
   
      setError(error instanceof Error ? error.message : "Failed to load calls")
      setCalls([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId)
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A"
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "ended":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "bg-green-100 text-green-800"
      case "negative":
        return "bg-red-100 text-red-800"
      case "neutral":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Calls</span>
          <div className="flex items-center space-x-2">
            {/* Agent Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={selectedAgentId} onValueChange={handleAgentChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {agent.substring(0, 12)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={fetchCalls} disabled={isRefreshing} className="">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {calls.length === 0 && !error ? (
            <div className="text-center py-8 text-gray-500">No calls found</div>
          ) : (
            calls.map((call) => (
              <div
                key={call.call_id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{call.call_id.substring(0, 8)}...</div>
                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                      <User className="h-3 w-3" />
                     
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge className={getStatusColor(call.call_status)}>{call.call_status}</Badge>
                    {call.user_sentiment && (
                      <Badge className={`ml-2 ${getSentimentColor(call.user_sentiment)}`}>{call.user_sentiment}</Badge>
                    )}
                  </div>

                  <div className="text-right text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(call.duration_ms)}
                    </div>
                    <div className="text-xs text-gray-500">{formatTimestamp(call.start_timestamp)}</div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <a href="#/call-history" className="flex w-full">
                          View Details
                        </a>
                      </DropdownMenuItem>
                      {call.recording_url && (
                        <DropdownMenuItem onClick={() => window.open(call.recording_url, "_blank")}>
                          Download Recording
                        </DropdownMenuItem>
                      )}
                      {call.transcript && <DropdownMenuItem>Export Transcript</DropdownMenuItem>}
                      <DropdownMenuItem>
                        <Link href="/call-history" className="flex text-sm font-medium  text-[#1F4280] w-full">
                          Call History
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
