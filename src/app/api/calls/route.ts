import { type NextRequest, NextResponse } from "next/server"

const RETELL_API_KEY = 'key_f1b00b4ebfbda2cfe8ffb6a357b2'

export async function GET(request: NextRequest) {
  try {
    if (!RETELL_API_KEY) {
      return NextResponse.json({ error: "RETELL_API_KEY environment variable not configured" }, { status: 500 })
    }

    // Get agent_id from query parameters
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agent_id") || "agent_a3f5d1a7dd6d0abe1ded29a1fc"

    // Build filter criteria
    const filterCriteria: any = {
      call_status: ["ended", "in_progress", "registered"],
      call_type: ["web_call", "phone_call"],
      agent_id: [agentId]
    }

    const response = await fetch("https://api.retellai.com/v2/list-calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter_criteria: filterCriteria,
        sort_order: "descending",
        limit: 100,
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    // Handle both array response and object with calls property
    const calls = Array.isArray(data) ? data : (data.calls || [])
    
    // Process calls to ensure consistent format
    const processedCalls = calls.map((call: any) => ({
      ...call,
      user_sentiment: call.call_analysis?.user_sentiment || "Unknown",
      // Ensure other required fields are present
      call_status: call.call_status || "unknown",
      start_timestamp: call.start_timestamp || Date.now(),
      duration_ms: call.duration_ms || 0
    }))
    
    return NextResponse.json({ 
      calls: processedCalls,
      agent_id: agentId || "all"
    })
  } catch (error) {

    
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 })
  }
}
