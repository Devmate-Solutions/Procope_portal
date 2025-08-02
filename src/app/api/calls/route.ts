import { type NextRequest, NextResponse } from "next/server"
import { getCalls } from "@/lib/aws-api"

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
    const data = await getCalls(filters)
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Failed to fetch calls:', error)
    return NextResponse.json({ error: error.message || "Failed to fetch calls" }, { status: 500 })
  }
}
