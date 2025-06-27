import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please login first." },
        { status: 401 },
      )
    }

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get("pdf") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No PDF file provided" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ success: false, error: "File must be a PDF" }, { status: 400 })
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB limit
      return NextResponse.json({ success: false, error: "File size must be less than 100MB" }, { status: 400 })
    }

    // Create FormData for external API
    const apiFormData = new FormData()
    apiFormData.append("pdf", file)

    // Call external PDF extraction API with extended timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60 * 60 * 1000) // 60 minutes timeout

    try {
      const response = await fetch("https://func-retell425.azurewebsites.net/api/pdf/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: apiFormData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("External API error:", errorText)

        if (response.status === 401) {
          return NextResponse.json(
            { success: false, error: "Authentication failed. Please login again." },
            { status: 401 },
          )
        }

        if (response.status === 413) {
          return NextResponse.json(
            { success: false, error: "File too large. Please try a smaller PDF file." },
            { status: 413 },
          )
        }

        if (response.status === 429) {
          return NextResponse.json(
            { success: false, error: "Too many requests. Please wait a moment and try again." },
            { status: 429 },
          )
        }

        return NextResponse.json(
          { success: false, error: "PDF processing failed. Please try again or contact support." },
          { status: 500 },
        )
      }

      const data = await response.json()

      if (data.success) {
        return NextResponse.json({
          success: true,
          message: "PDF extracted successfully",
        })
      } else {
        return NextResponse.json({ success: false, error: data.error || "PDF extraction failed" }, { status: 500 })
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Processing timeout. Large files may take up to 50 minutes. Please try again or contact support.",
          },
          { status: 408 },
        )
      }

      throw fetchError
    }
  } catch (error) {
    console.error("PDF extraction error:", error)

    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Request timeout. Large files may take longer to process. Please try again.",
          },
          { status: 408 },
        )
      }
    }

    return NextResponse.json(
      { success: false, error: "Internal server error during PDF processing. Please try again." },
      { status: 500 },
    )
  }
}
