"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { Upload, FileText, Copy, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import AuthenticatedLayout from "../components/AuthenticatedLayout"

interface ExtractedData {
  ocr: {
    pageCount: number
    textLength: number
    fullText: string
  }
  upload: {
    size: number
    filename: string
  }
}

export default function PDFExtractorPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [progress, setProgress] = useState(0)
  const [processingMessage, setProcessingMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showStatus = (message: string, type: "success" | "error" | "info") => {
    setStatus({ message, type })
    setTimeout(() => setStatus(null), 8000)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      if (file.size > 100 * 1024 * 1024) {
        // 100MB limit
        showStatus("File size must be less than 100MB", "error")
        return
      }
      setSelectedFile(file)
      showStatus(`PDF file "${file.name}" selected successfully`, "success")
    } else {
      showStatus("Please select a valid PDF file", "error")
      setSelectedFile(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === "application/pdf") {
        if (file.size > 100 * 1024 * 1024) {
          showStatus("File size must be less than 100MB", "error")
          return
        }
        setSelectedFile(file)
        showStatus(`PDF file "${file.name}" selected successfully`, "success")
      } else {
        showStatus("Please drop a valid PDF file", "error")
      }
    }
  }

  const extractText = async () => {
    if (!selectedFile) {
      showStatus("Please select a PDF file first", "error")
      return
    }

    setIsLoading(true)
    setProgress(0)
    setProcessingMessage("Uploading PDF file...")
    showStatus("Starting PDF processing... Large files may take 30-50 minutes.", "info")

    // Simulate progress updates during processing
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev
        return prev + Math.random() * 2
      })
    }, 3000)

    // Update processing messages
    const messageInterval = setInterval(() => {
      const messages = [
        "Uploading PDF file...",
        "Processing document pages...",
        "Extracting text content...",
        "Analyzing document structure...",
        "Optimizing text output...",
        "Finalizing extraction...",
      ]
      setProcessingMessage(messages[Math.floor(Math.random() * messages.length)])
    }, 8000)

    try {
      const formData = new FormData()
      formData.append("pdf", selectedFile)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      clearInterval(messageInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to extract text from PDF")
      }

      const data = await response.json()

      if (data.success) {
        setExtractedData(data.data)
        setProcessingMessage("Processing completed successfully!")
        showStatus("Text extraction completed successfully!", "success")
      } else {
        throw new Error(data.error || "Text extraction failed")
      }
    } catch (error) {
      clearInterval(progressInterval)
      clearInterval(messageInterval)
      setProgress(0)
      setProcessingMessage("")

      if (error instanceof Error) {
        if (error.name === "AbortError" || error.message.includes("timeout")) {
          showStatus(
            "Processing is taking longer than expected. Large files may take up to 50 minutes. Please try again or contact support.",
            "error",
          )
        } else {
          showStatus(`Processing failed: ${error.message}`, "error")
        }
      } else {
        showStatus("Processing failed: Unknown error occurred", "error")
      }
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setProgress(0)
        setProcessingMessage("")
      }, 3000)
    }
  }

  const copyText = async () => {
    if (extractedData) {
      try {
        await navigator.clipboard.writeText(extractedData.ocr.fullText)
        showStatus("Text copied to clipboard!", "success")
      } catch {
        showStatus("Failed to copy text to clipboard", "error")
      }
    }
  }

  const downloadText = () => {
    if (extractedData) {
      const blob = new Blob([extractedData.ocr.fullText], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `extracted-text-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
      showStatus("Text file downloaded!", "success")
    }
  }

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length
  }

  return (
    <AuthenticatedLayout>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r  bg-[#1F4280] p-3 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6" />
              PDF Text Extractor
            </CardTitle>
            <CardDescription className="text-blue-100">
              Upload PDFs and extract text using AI-powered processing
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Status Messages */}
            {status && (
              <Alert
                className={
                  status.type === "error"
                    ? "border-red-500 bg-red-50"
                    : status.type === "success"
                      ? "border-green-500 bg-green-50"
                      : "border-blue-500 bg-blue-50"
                }
              >
                {status.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : status.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}

            {/* File Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Upload PDF File</h3>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                {selectedFile ? (
                  <div>
                    <p className="text-green-600 font-medium">✅ {selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      Size: {formatFileSize(selectedFile.size)} | Ready to extract
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600">Click here or drag & drop a PDF file</p>
                    <p className="text-sm text-gray-400 mt-1">Maximum file size: 100MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                <div className="flex justify-between text-sm font-medium">
                  <span>Processing PDF...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <progress value={progress} className="w-full" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{processingMessage}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Large files may take 30-50 minutes to process</p>
                    <p>• Please keep this tab open during processing</p>
                    <p>• Processing time depends on file size and complexity</p>
                  </div>
                </div>
              </div>
            )}

            {/* Extract Button */}
            <Button
                          onClick={extractText}
                          disabled={!selectedFile || isLoading}
                          className="w-full bg-gradient-to-r  bg-[#1F4280] hover:from-blue-700 hover:to-indigo-700"
                          size="lg" variant={undefined}            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting Text...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Extract Text
                </>
              )}
            </Button>

         
          </CardContent>
        </Card>
      </div>
    </div>
    </AuthenticatedLayout>
  )
}
