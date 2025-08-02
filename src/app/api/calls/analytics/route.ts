import { type NextRequest, NextResponse } from "next/server"
import { getAnalytics } from "@/lib/aws-api"

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const filters: any = {}
    
    // Extract filters from query parameters
    for (const [key, value] of searchParams.entries()) {
      filters[key] = value
    }

    // Call the AWS API
    const data = await getAnalytics(filters)
    
    // If the AWS API returns raw calls data, process it
    if (data.calls || Array.isArray(data)) {
      const calls = Array.isArray(data) ? data : data.calls || []
      const startDate = searchParams.get("start_date")
      const endDate = searchParams.get("end_date")
      const agentId = searchParams.get("agent_id")
      
      // Extract unique agent IDs
      const agentIds: string[] = agentId
        ? [agentId]
        : ([...new Set(calls.map((call: any) => call.agent_id).filter(Boolean))] as string[])
      
      // Process the data
      const processedData = processRealApiData(calls, startDate, endDate, agentIds)
      return NextResponse.json({
        ...processedData,
        selectedAgentId: agentId || "all",
      })
    }
    
    // Return data as-is if already processed
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Failed to fetch analytics:', error)
    
    // Return error response
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch analytics data",
        totalCalls: 0,
        averageDuration: "00:00",
        averageLatency: "0ms",
        chartData: [],
        agents: [],
        rawCalls: [],
        apiStatus: "error",
      },
      { status: 500 },
    )
  }
}

function processRealApiData(calls: any[], startDate?: string | null, endDate?: string | null, agentIds: string[] = []) {
  // Filter calls by date range if provided
  let filteredCalls = calls

  if (startDate && endDate) {
    const startTime = new Date(startDate).getTime()
    const endTime = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1) // End of day

    filteredCalls = calls.filter((call: any) => {
      if (!call.start_timestamp) return false
      const callTime = new Date(call.start_timestamp).getTime()
      return callTime >= startTime && callTime <= endTime
    })
  }

  const totalCalls = filteredCalls.length
  const totalDuration = filteredCalls.reduce((sum: number, call: any) => {
    return sum + (call.duration_ms || 0)
  }, 0)

  const averageDurationMs = totalCalls > 0 ? totalDuration / totalCalls : 0
  const averageDuration = formatDuration(averageDurationMs)

  // Calculate real latency from filtered calls
  const latencies = filteredCalls
    .map((call: any) => {
      if (call.latency?.e2e?.p50) return call.latency.e2e.p50
      if (call.latency?.e2e?.avg) return call.latency.e2e.avg
      if (call.latency?.llm?.p50) return call.latency.llm.p50
      if (call.latency?.tts?.p50) return call.latency.tts.p50
      return null
    })
    .filter((l) => l !== null)

  const averageLatency =
    latencies.length > 0 ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0

  // Generate time series data from filtered calls
  const chartData = generateRealTimeSeriesData(filteredCalls, startDate, endDate)

  // Process calls with real data only
  const processedCalls = filteredCalls.map((call: any) => ({
    ...call,
    call_id: call.call_id,
    agent_id: call.agent_id,
    call_successful: determineRealCallSuccess(call),
    user_sentiment: call.call_analysis?.user_sentiment || "Unknown",
    disconnection_reason: call.disconnection_reason || "unknown",
    direction: call.direction || (call.call_type === "web_call" ? "web" : "unknown"),
    call_type: call.call_type || "phone_call",
  }))

  return {
    totalCalls,
    averageDuration,
    averageLatency: averageLatency > 0 ? `${averageLatency}ms` : "N/A",
    chartData,
    agents: agentIds.length > 0 ? agentIds : ["No agents found"],
    rawCalls: processedCalls,
    apiStatus: "success",
    dateRange: { startDate, endDate },
  }
}

function determineRealCallSuccess(call: any): boolean {
  // Use real call analysis if available
  if (call.call_analysis?.call_successful !== undefined) {
    return call.call_analysis.call_successful
  }

  // Use call_successful field if available
  if (call.call_successful !== undefined) {
    return call.call_successful
  }

  // Determine based on call status and disconnection reason
  if (call.call_status === "ended") {
    const successfulReasons = ["user_hangup", "agent_hangup", "call_transfer"]
    return successfulReasons.includes(call.disconnection_reason)
  }

  return false
}

function generateRealTimeSeriesData(calls: any[], startDate?: string | null, endDate?: string | null) {
  const timeSeriesData = []

  // Determine date range
  let rangeStart: Date
  let rangeEnd: Date

  if (startDate && endDate) {
    rangeStart = new Date(startDate)
    rangeEnd = new Date(endDate)
  } else if (calls.length > 0) {
    // Use actual call data range
    const timestamps = calls.map((call) => call.start_timestamp).filter(Boolean)
    if (timestamps.length > 0) {
      rangeStart = new Date(Math.min(...timestamps))
      rangeEnd = new Date(Math.max(...timestamps))
    } else {
      rangeEnd = new Date()
      rangeStart = new Date()
      rangeStart.setDate(rangeEnd.getDate() - 30)
    }
  } else {
    // Default to last 30 days
    rangeEnd = new Date()
    rangeStart = new Date()
    rangeStart.setDate(rangeEnd.getDate() - 30)
  }

  // Calculate number of days
  const daysDiff = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)))

  // Generate data for each day in the range
  for (let i = 0; i < daysDiff; i++) {
    const date = new Date(rangeStart)
    date.setDate(rangeStart.getDate() + i)
    const dateStr = date.toISOString().split("T")[0]

    // Filter calls for this specific day
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const callsThisDay = calls.filter((call) => {
      if (!call.start_timestamp) return false
      const callDate = new Date(call.start_timestamp)
      return callDate >= dayStart && callDate <= dayEnd
    })

    // Calculate real metrics for this day
    const callCount = callsThisDay.length
    const totalDuration = callsThisDay.reduce((sum, call) => sum + (call.duration_ms || 0), 0)
    const avgDuration = callCount > 0 ? totalDuration / callCount : 0

    // Calculate real latency for this day
    const dayLatencies = callsThisDay
      .map((call) => {
        if (call.latency?.e2e?.p50) return call.latency.e2e.p50
        if (call.latency?.e2e?.avg) return call.latency.e2e.avg
        if (call.latency?.llm?.p50) return call.latency.llm.p50
        return null
      })
      .filter((l) => l !== null && l !== undefined)
    const avgLatency = dayLatencies.length > 0 ? dayLatencies.reduce((a, b) => a + b, 0) / dayLatencies.length : 0

    timeSeriesData.push({
      date: dateStr,
      calls: callCount,
      duration: Math.round(avgDuration / 1000), // in seconds
      latency: Math.round(avgLatency),
      successRate:
        callCount > 0 ? (callsThisDay.filter((call) => determineRealCallSuccess(call)).length / callCount) * 100 : 0,
    })
  }

  return timeSeriesData
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}
