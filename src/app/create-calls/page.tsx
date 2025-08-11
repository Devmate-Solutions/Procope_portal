"use client"
import { useEffect, useState } from "react"
import type React from "react"

import { AuthenticatedLayout } from "@/app/components/AuthenticatedLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PhoneCall, Upload, Download, Plus, Trash2, Play, Search, Eye } from "lucide-react"
import { createCall, createBatchCalls, getAgents, getPhoneNumbers } from "@/lib/aws-api"
import { getCurrentUser } from "@/lib/auth"

interface CallData {
  from_number: string
  to_number: string
  agent_id: string
  customer_name?: string
  metadata?: Record<string, any>
}

// Helper function to properly parse CSV rows with quoted values
function parseCSVRow(row: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  // Add the last value
  values.push(current.trim())

  return values
}

// Helper function to generate follow-up date in MM/DD/YYYY format
function generateFollowUpDate(daysFromNow = 14): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)

  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const year = date.getFullYear()

  return `${month}/${day}/${year}`
}

export default function CreateCallsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Single call form
  const [singleCall, setSingleCall] = useState<CallData>({
    from_number: "",
    to_number: "",
    agent_id: "",
    customer_name: "",
    metadata: {},
  })

  // Batch calls
  const [batchCalls, setBatchCalls] = useState<CallData[]>([])
  const [csvData, setCsvData] = useState("")
  const [activeTab, setActiveTab] = useState<"single" | "batch" | "csv" | "history">("single")

  // Patient history for template1 users
  const [patients, setPatients] = useState<any[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [filteredPatients, setFilteredPatients] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "called" | "not-called" | "failed">("all")

  // Patient history for template2 users
  const [template2Patients, setTemplate2Patients] = useState<any[]>([])
  const [loadingTemplate2Patients, setLoadingTemplate2Patients] = useState(false)
  const [filteredTemplate2Patients, setFilteredTemplate2Patients] = useState<any[]>([])
  const [template2SearchTerm, setTemplate2SearchTerm] = useState("")
  const [template2StatusFilter, setTemplate2StatusFilter] = useState<"all" | "called" | "not-called" | "failed">("all")

  // Dialog state for viewing long notes
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [notesDialogTitle, setNotesDialogTitle] = useState("")
  const [notesDialogContent, setNotesDialogContent] = useState("")

  const openNotesDialog = (title: string, content: string) => {
    setNotesDialogTitle(title)
    setNotesDialogContent(content || "N/A")
    setIsNotesDialogOpen(true)
  }

  const currentUser = getCurrentUser()

  // Debug logging
  console.log("🔍 Current user:", currentUser)
  console.log("🔍 User allowedPages:", currentUser?.allowedPages)

  // Check if user has template1 access (which should hide single call creation)
  const isTemplate1User = currentUser?.allowedPages?.includes("template1")
  const isTemplate2User = currentUser?.allowedPages?.includes("template2")

  console.log("🔍 Is Template1 User:", isTemplate1User)
  console.log("🔍 Is Template2 User:", isTemplate2User)

  useEffect(() => {
    loadAgentsAndPhoneNumbers()
    // If template1 user, default to CSV import tab since single call is hidden
    if (isTemplate1User) {
      console.log("📝 Setting default tab to CSV for template1 user")
      setActiveTab("csv")
      loadPatientHistory()
    }
    // If template2 user, default to CSV import tab and load template2 patient history
    if (isTemplate2User) {
      console.log("📝 Setting default tab to CSV for template2 user")
      setActiveTab("csv")
      loadTemplate2PatientHistory()
    }
  }, [isTemplate1User, isTemplate2User])

  // Filter patients based on search term and status
  useEffect(() => {
    let filtered = patients

    // Filter by search term (name, phone, treatment)
    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          `${patient.firstName} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (patient.phone_number && patient.phone_number.includes(searchTerm)) ||
          (patient.Treatment && patient.Treatment.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (patient.patient_id && patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((patient) => {
        if (statusFilter === "called") return patient.Call_Status === "called"
        if (statusFilter === "not-called") return patient.Call_Status === "not-called" || !patient.Call_Status
        if (statusFilter === "failed") return patient.Call_Status === "failed"
        return true
      })
    }

    setFilteredPatients(filtered)
  }, [patients, searchTerm, statusFilter])

  // Filter template2 patients based on search term and status
  useEffect(() => {
    let filtered = template2Patients

    // Filter by search term (name, phone)
    if (template2SearchTerm) {
      filtered = filtered.filter(
        (patient) =>
          `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(template2SearchTerm.toLowerCase()) ||
          (patient.phoneNumber && patient.phoneNumber.includes(template2SearchTerm)) ||
          (patient.patient_id && patient.patient_id.toLowerCase().includes(template2SearchTerm.toLowerCase())),
      )
    }

    // Filter by status
    if (template2StatusFilter !== "all") {
      filtered = filtered.filter((patient) => {
        if (template2StatusFilter === "called") return patient.Call_Status === "called"
        if (template2StatusFilter === "not-called") return patient.Call_Status === "not-called" || !patient.Call_Status
        if (template2StatusFilter === "failed") return patient.Call_Status === "failed"
        return true
      })
    }

    setFilteredTemplate2Patients(filtered)
  }, [template2Patients, template2SearchTerm, template2StatusFilter])

  const loadPatientHistory = async () => {
    if (!isTemplate1User) return

    try {
      setLoadingPatients(true)
      const response = await fetch("https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/nomads/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "query",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients || [])
        console.log("📋 Loaded patient history:", data.patients?.length || 0, "patients")
      } else {
        console.error("Failed to load patient history")
      }
    } catch (error) {
      console.error("Error loading patient history:", error)
    } finally {
      setLoadingPatients(false)
    }
  }

  const loadTemplate2PatientHistory = async () => {
    if (!isTemplate2User) return

    try {
      setLoadingTemplate2Patients(true)
      const response = await fetch(
        "https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/anesthesia/patients",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "query",
          }),
        },
      )

      if (response.ok) {
        const data = await response.json()
        setTemplate2Patients(data.patients || [])
        console.log("📋 Loaded template2 patient history:", data.patients?.length || 0, "patients")
      } else {
        console.error("Failed to load template2 patient history")
      }
    } catch (error) {
      console.error("Error loading template2 patient history:", error)
    } finally {
      setLoadingTemplate2Patients(false)
    }
  }

  const loadAgentsAndPhoneNumbers = async () => {
    try {
      // Load agents and phone numbers in parallel
      const [agentsData, phoneNumbersData] = await Promise.all([getAgents(), getPhoneNumbers()])

      // Remove duplicates and ensure unique agents
      const uniqueAgents = Array.isArray(agentsData)
        ? agentsData.filter((agent, index, self) => index === self.findIndex((a) => a.agent_id === agent.agent_id))
        : []

      setAgents(uniqueAgents)
      setPhoneNumbers(phoneNumbersData || [])

      // Auto-fill from number if only one phone number available
      if (phoneNumbersData && phoneNumbersData.length === 1) {
        setSingleCall((prev) => ({
          ...prev,
          from_number: phoneNumbersData[0].phoneNumber,
        }))
      }

      console.log("📞 Loaded agents:", uniqueAgents)
      console.log("📞 Loaded phone numbers:", phoneNumbersData)
    } catch (error) {
      console.error("Failed to load agents and phone numbers:", error)
      setError("Failed to load agents and phone numbers")
    }
  }

  const handleSingleCall = async () => {
    try {
      if (!singleCall.from_number || !singleCall.to_number || !singleCall.agent_id) {
        setError("From number, to number, and agent are required")
        return
      }

      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const callData = {
        from_number: singleCall.from_number,
        to_number: singleCall.to_number,
        agent_id: singleCall.agent_id,
        retell_llm_dynamic_variables: singleCall.customer_name
          ? {
              customer_name: singleCall.customer_name,
            }
          : {},
        metadata: singleCall.metadata || {},
      }

      const result = await createCall(callData)
      setSuccess(`Call created successfully! Call ID: ${result.call_id}`)

      // Reset form
      setSingleCall({
        from_number: "",
        to_number: "",
        agent_id: "",
        customer_name: "",
        metadata: {},
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create call")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBatchCalls = async () => {
    try {
      if (batchCalls.length === 0) {
        setError("No calls to process")
        return
      }

      setIsLoading(true)
      setError(null)
      setSuccess(null)

      if (isTemplate1User) {
        // Template1 users: Handle patient data with proper mapping
        const formattedCalls = batchCalls.map((call) => {
          // Extract dynamic variables from metadata
          const { patientData, isTemplate1, ...dynamicVars } = call.metadata || {}

          return {
            from_number: call.from_number,
            to_number: call.to_number,
            override_agent_id: call.agent_id, // Use override_agent_id like n8n workflow
            override_agent_version: 1, // Like n8n workflow
            retell_llm_dynamic_variables: dynamicVars, // All the mapped patient variables
            metadata: {},
          }
        })

        console.log("📞 Template1 formatted calls:", formattedCalls)
        const result = await createBatchCalls(formattedCalls)

        // After successful batch calls, update patient database like n8n workflow
        if (result.summary && result.summary.successful > 0) {
          try {
            // Prepare patient updates for nomads API with correct field mapping
            const patientUpdates = batchCalls
              .filter((call) => call.metadata?.patientData)
              .map((call) => {
                const patientData = call.metadata?.patientData

                // Check if call was registered, if not set status to not-called
                const callStatus = result.summary?.successful > 0 ? "called" : "not-called"

                // Map CSV fields to new API expected fields
                return {
                  firstName: patientData.firstname || patientData["firstname"] || "",
                  lastName: patientData.lastname || patientData["lastname"] || "",
                  DOB: patientData.dob || patientData["dob"] || "",
                  phone_number: (patientData.phonenumber || patientData["phone number"] || "").replace(/\D/g, ""), // Remove non-digits
                  Treatment: patientData.treatment || "",
                  postTreatment_Notes: patientData.posttreatment_notes || patientData["posttreatment_notes"] || "",
                  postTreatment_Prescription:
                    patientData.posttreatment_prescription || patientData["posttreatment_prescription"] || "",
                  followUp_Appointment: patientData.followup_appointment || patientData["followup_appointment"] || "",
                  Call_Status: callStatus,
                  followUp_Notes: patientData.followup_notes || patientData["followup_notes"] || "",
                  followUp_Date: patientData.followup_date || patientData["followup_date"] || generateFollowUpDate(),
                  postFollowup_Status:
                    patientData.postfollowup_status || patientData["postfollowup_status"] || "not-called",
                  Feedback: "",
                }
              })

            // Call nomads/patients API to update database
            if (patientUpdates.length > 0) {
              console.log("📝 Updating patient database with correct format:", patientUpdates)

              for (const patientUpdate of patientUpdates) {
                const updateResponse = await fetch(
                  "https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/nomads/patients/lambda-endpoint",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      action: "manage",
                      data: patientUpdate,
                    }),
                  },
                )

                if (!updateResponse.ok) {
                  console.warn("Failed to update patient:", patientUpdate)
                } else {
                  const result = await updateResponse.json()
                  console.log("✅ Patient update result:", result)
                }
              }

              setSuccess(
                `Batch completed: ${result.summary.successful}/${result.summary.total} calls created successfully\nPatient database updated for ${patientUpdates.length} patients`,
              )
            } else {
              setSuccess(
                `Batch completed: ${result.summary.successful}/${result.summary.total} calls created successfully`,
              )
            }
          } catch (updateError) {
            console.error("Failed to update patient database:", updateError)
            setSuccess(
              `Batch completed: ${result.summary.successful}/${result.summary.total} calls created successfully\nWarning: Patient database update failed`,
            )
          }
        }

        if (result.failed_calls && result.failed_calls.length > 0) {
          setError(`Some calls failed: ${result.failed_calls.map((f: any) => f.error).join(", ")}`)
        }
      } else {
        // Regular users: Standard call format with dynamic agent/phone selection
        const formattedCalls = batchCalls.map((call) => {
          // Use dynamic agent and phone if not specified
          let fromNumber = call.from_number
          let agentId = call.agent_id

          // If no from_number specified, use first available phone
          if (!fromNumber && phoneNumbers.length > 0) {
            fromNumber = phoneNumbers[0].phoneNumber
          }

          // If no agent specified, use first available agent
          if (!agentId && agents.length > 0) {
            agentId = agents[0].agent_id
          }

          return {
            from_number: fromNumber,
            to_number: call.to_number,
            agent_id: agentId,
            retell_llm_dynamic_variables: call.customer_name
              ? {
                  customer_name: call.customer_name,
                }
              : {},
            metadata: call.metadata || {},
          }
        })

        console.log("📞 Regular user formatted calls:", formattedCalls)
        const result = await createBatchCalls(formattedCalls)

        if (result.summary) {
          setSuccess(`Batch completed: ${result.summary.successful}/${result.summary.total} calls created successfully`)

          if (result.failed_calls && result.failed_calls.length > 0) {
            setError(`Some calls failed: ${result.failed_calls.map((f: any) => f.error).join(", ")}`)
          }
        } else {
          setSuccess("Batch calls created successfully!")
        }
      }

      // Reset batch calls
      setBatchCalls([])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create batch calls")
    } finally {
      setIsLoading(false)
    }
  }

  const addBatchCall = () => {
    setBatchCalls([
      ...batchCalls,
      {
        from_number: "",
        to_number: "",
        agent_id: "",
        customer_name: "",
        metadata: {},
      },
    ])
  }

  const updateBatchCall = (index: number, field: keyof CallData, value: string) => {
    const updated = [...batchCalls]
    updated[index] = { ...updated[index], [field]: value }
    setBatchCalls(updated)
  }

  const removeBatchCall = (index: number) => {
    setBatchCalls(batchCalls.filter((_, i) => i !== index))
  }

  const processCsvData = async () => {
    try {
      if (!csvData.trim()) {
        setError("Please enter CSV data")
        return
      }

      setIsLoading(true)
      setError(null)
      setSuccess(null)

      // Handle different line endings (Windows \r\n, Unix \n, Mac \r)
      const lines = csvData.trim().split(/\r?\n|\r/)
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\r$/, ""))

      console.log("🔍 Debug CSV Processing:")
      console.log("📄 Raw CSV lines:", lines)
      console.log("📋 Parsed headers:", headers)
      console.log("👤 Is Template1 User:", isTemplate1User)
      console.log("👤 Is Template2 User:", isTemplate2User)

      if (isTemplate1User) {
        // Template1 users: Process patient data format and make calls directly
        // Check for flexible header variations
        const phoneNumberHeader = headers.find(
          (h) => h === "phonenumber" || h === "phone number" || h === "phone_number" || h === "phonenumber",
        )
        const firstNameHeader = headers.find(
          (h) => h === "firstname" || h === "first name" || h === "first_name" || h === "firstname",
        )
        const lastNameHeader = headers.find(
          (h) => h === "lastname" || h === "last name" || h === "last_name" || h === "lastname",
        )

        console.log("🔍 Header matching:")
        console.log("📞 Phone header found:", phoneNumberHeader)
        console.log("👤 First name header found:", firstNameHeader)
        console.log("👤 Last name header found:", lastNameHeader)

        if (!phoneNumberHeader || !firstNameHeader || !lastNameHeader) {
          setError(
            `Missing required headers. Found: ${headers.join(", ")}\nRequired: firstName/firstname, lastName/lastname, phoneNumber/phonenumber/phone number\n\nPhone header: ${phoneNumberHeader}\nFirst name header: ${firstNameHeader}\nLast name header: ${lastNameHeader}`,
          )
          setIsLoading(false)
          return
        }

        const calls: CallData[] = []

        console.log("🔍 Processing data rows...")

        for (let i = 1; i < lines.length; i++) {
          console.log(`📝 Processing row ${i}:`, lines[i])

          // Proper CSV parsing that handles quoted values with commas
          const values = parseCSVRow(lines[i])
          console.log("📊 Split values:", values)
          console.log("📏 Values length:", values.length, "Headers length:", headers.length)

          if (values.length !== headers.length) {
            console.log("⚠️ Skipping row - length mismatch")
            continue
          }

          const patientData: any = {}

          // Map CSV headers to patient data
          headers.forEach((header, index) => {
            const value = values[index]
            patientData[header] = value
          })

          console.log("👤 Patient data mapped:", patientData)

          // Get phone number from flexible header
          const phoneNumber = patientData[phoneNumberHeader]
          console.log("📞 Phone number extracted:", phoneNumber)

          // Skip if no phone number
          if (!phoneNumber) {
            console.log("⚠️ Skipping row - no phone number")
            continue
          }

          // Get names from flexible headers first
          const firstName = patientData[firstNameHeader]
          const lastName = patientData[lastNameHeader]

          // Check call status - only process "not-called" patients
          const callStatusHeader = headers.find((h) => h === "callstatus" || h === "call status" || h === "call_status")
          const callStatus = callStatusHeader ? patientData[callStatusHeader] : ""

          if (callStatus && callStatus.toLowerCase() === "called") {
            console.log("⚠️ Skipping row - patient already called:", firstName, lastName)
            continue
          }

          // Format phone number (remove non-digits and add +)
          const cleanPhone = phoneNumber.replace(/\D/g, "")
          const formattedPhone = cleanPhone.startsWith("1") ? `+${cleanPhone}` : `+1${cleanPhone}`

          // Map to retell_llm_dynamic_variables like n8n workflow with flexible header mapping
          const dynamicVars: any = {}
          if (firstName) dynamicVars.firstName = firstName
          if (lastName) dynamicVars.lastName = lastName

          // Map other fields with flexible header names
          const dobHeader = headers.find((h) => h === "dob" || h === "date of birth" || h === "dateofbirth")
          if (dobHeader && patientData[dobHeader]) dynamicVars.DOB = patientData[dobHeader]

          if (phoneNumber) dynamicVars.phoneNumber = phoneNumber

          const treatmentHeader = headers.find((h) => h === "treatment" || h === "treatments")
          if (treatmentHeader && patientData[treatmentHeader]) dynamicVars.Treatment = patientData[treatmentHeader]

          const postTreatmentNotesHeader = headers.find(
            (h) => h === "posttreatment_notes" || h === "post treatment notes" || h === "posttreatmentnotes",
          )
          if (postTreatmentNotesHeader && patientData[postTreatmentNotesHeader]) {
            dynamicVars.postTreatment_Notes = patientData[postTreatmentNotesHeader]
          }

          const postTreatmentPrescriptionHeader = headers.find(
            (h) =>
              h === "posttreatment_prescription" ||
              h === "post treatment prescription" ||
              h === "posttreatmentprescription",
          )
          if (postTreatmentPrescriptionHeader && patientData[postTreatmentPrescriptionHeader]) {
            dynamicVars.postTreatment_Prescription = patientData[postTreatmentPrescriptionHeader]
          }

          const followUpAppointmentHeader = headers.find(
            (h) =>
              h === "followupappointment" ||
              h === "followup_appointment" ||
              h === "follow up appointment" ||
              h === "followup appointment",
          )
          if (followUpAppointmentHeader && patientData[followUpAppointmentHeader]) {
            dynamicVars.followUpAppointment = patientData[followUpAppointmentHeader]
          }

          // Use the already declared callStatusHeader variable
          if (callStatusHeader && patientData[callStatusHeader]) {
            dynamicVars.callStatus = patientData[callStatusHeader]
          }

          const followUpNotesHeader = headers.find(
            (h) => h === "followupnotes" || h === "followup_notes" || h === "follow up notes" || h === "followup notes",
          )
          if (followUpNotesHeader && patientData[followUpNotesHeader]) {
            dynamicVars.followUpNotes = patientData[followUpNotesHeader]
          }

          const followUpDateHeader = headers.find(
            (h) => h === "followupdate" || h === "followup_date" || h === "follow up date" || h === "followup date",
          )
          if (followUpDateHeader && patientData[followUpDateHeader]) {
            dynamicVars.followUpDate = patientData[followUpDateHeader]
          }

          const postFollowupStatusHeader = headers.find(
            (h) =>
              h === "postfollowupstatus" ||
              h === "postfollowup_status" ||
              h === "post followup status" ||
              h === "post followup_status",
          )
          if (postFollowupStatusHeader && patientData[postFollowupStatusHeader]) {
            dynamicVars.postFollowupStatus = patientData[postFollowupStatusHeader]
          }

          // Find outbound agent dynamically
          const outboundAgent = agents.find((agent) => agent.type === "outbound")
          const outboundPhone = phoneNumbers.find((phone) => phone.hasOutbound)

          const call: CallData = {
            from_number: outboundPhone?.phoneNumber || "+19728338727", // Dynamic outbound phone
            to_number: formattedPhone,
            agent_id: outboundAgent?.agent_id || "agent_8f58e11e169672fd4d55563b4f", // Dynamic outbound agent
            customer_name: `${firstName || ""} ${lastName || ""}`.trim(),
            metadata: {
              ...dynamicVars,
              isTemplate1: true,
              patientData: patientData,
            },
          }

          calls.push(call)
        }

        if (calls.length === 0) {
          setError("No valid patient records found in CSV")
          setIsLoading(false)
          return
        }

        // Directly make the calls for template1 users
        console.log("📞 Processing", calls.length, "patient calls directly from CSV")

        // Format calls for API
        const formattedCalls = calls.map((call) => {
          const { patientData, isTemplate1, ...dynamicVars } = call.metadata || {}

          return {
            from_number: call.from_number,
            to_number: call.to_number,
            override_agent_id: call.agent_id,
            override_agent_version: 1,
            retell_llm_dynamic_variables: dynamicVars,
            metadata: {},
          }
        })

        const result = await createBatchCalls(formattedCalls)

        // After successful batch calls, update patient database
        if (result.summary && result.summary.successful > 0) {
          try {
            // Prepare patient updates for nomads API with correct field mapping
            const patientUpdates = calls
              .filter((call) => call.metadata?.patientData)
              .map((call) => {
                const patientData = call.metadata?.patientData

                // Check if call was registered, if not set status to not-called
                const callStatus = result.summary?.successful > 0 ? "called" : "not-called"

                // Map CSV fields to new API expected fields
                return {
                  firstName: patientData.firstname || patientData["firstname"] || "",
                  lastName: patientData.lastname || patientData["lastname"] || "",
                  DOB: patientData.dob || patientData["dob"] || "",
                  phone_number: (patientData.phonenumber || patientData["phone number"] || "").replace(/\D/g, ""), // Remove non-digits
                  Treatment: patientData.treatment || "",
                  postTreatment_Notes: patientData.posttreatment_notes || patientData["posttreatment_notes"] || "",
                  postTreatment_Prescription:
                    patientData.posttreatment_prescription || patientData["posttreatment_prescription"] || "",
                  followUp_Appointment: patientData.followup_appointment || patientData["followup_appointment"] || "",
                  Call_Status: callStatus,
                  followUp_Notes: patientData.followup_notes || patientData["followup_notes"] || "",
                  followUp_Date: patientData.followup_date || patientData["followup_date"] || generateFollowUpDate(),
                  postFollowup_Status:
                    patientData.postfollowup_status || patientData["postfollowup_status"] || "not-called",
                  Feedback: "",
                }
              })

            if (patientUpdates.length > 0) {
              console.log("📝 Updating patient database with correct format:", patientUpdates)

              for (const patientUpdate of patientUpdates) {
                const updateResponse = await fetch(
                  "https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/nomads/patients/lambda-endpoint",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      action: "manage",
                      data: patientUpdate,
                    }),
                  },
                )

                if (!updateResponse.ok) {
                  console.warn("Failed to update patient:", patientUpdate)
                } else {
                  const result = await updateResponse.json()
                  console.log("✅ Patient update result:", result)
                }
              }

              setSuccess(
                `✅ Calls completed successfully!\n📞 ${result.summary.successful}/${result.summary.total} calls created\n📝 Patient database updated for ${patientUpdates.length} patients`,
              )
            } else {
              setSuccess(
                `✅ Calls completed successfully!\n���� ${result.summary.successful}/${result.summary.total} calls created`,
              )
            }
          } catch (updateError) {
            console.error("Failed to update patient database:", updateError)
            setSuccess(
              `✅ Calls completed successfully!\n📞 ${result.summary.successful}/${result.summary.total} calls created\n⚠️ Warning: Patient database update failed`,
            )
          }
        }

        if (result.failed_calls && result.failed_calls.length > 0) {
          setError(`Some calls failed: ${result.failed_calls.map((f: any) => f.error).join(", ")}`)
        }

        // Clear CSV data after successful processing
        setCsvData("")
      } else if (isTemplate2User) {
        // Template2 users: Process anesthesia patient data format and make calls directly
        // Check for flexible header variations for template2 format
        const phoneNumberHeader = headers.find(
          (h) => h === "phonenumber" || h === "phone number" || h === "phone_number",
        )
        const firstNameHeader = headers.find((h) => h === "firstname" || h === "first name" || h === "first_name")
        const lastNameHeader = headers.find((h) => h === "lastname" || h === "last name" || h === "last_name")

        console.log("🔍 Template2 Header matching:")
        console.log("📞 Phone header found:", phoneNumberHeader)
        console.log("👤 First name header found:", firstNameHeader)
        console.log("👤 Last name header found:", lastNameHeader)

        if (!phoneNumberHeader || !firstNameHeader || !lastNameHeader) {
          setError(
            `Missing required headers for Template2. Found: ${headers.join(", ")}\nRequired: firstName, lastName, phone number\n\nPhone header: ${phoneNumberHeader}\nFirst name header: ${firstNameHeader}\nLast name header: ${lastNameHeader}`,
          )
          setIsLoading(false)
          return
        }

        const calls: CallData[] = []

        console.log("🔍 Processing Template2 data rows...")

        for (let i = 1; i < lines.length; i++) {
          console.log(`📝 Processing Template2 row ${i}:`, lines[i])

          // Proper CSV parsing that handles quoted values with commas
          const values = parseCSVRow(lines[i])
          console.log("📊 Split values:", values)
          console.log("📏 Values length:", values.length, "Headers length:", headers.length)

          if (values.length !== headers.length) {
            console.log("⚠️ Skipping row - length mismatch")
            continue
          }

          const patientData: any = {}

          // Map CSV headers to patient data
          headers.forEach((header, index) => {
            const value = values[index]
            patientData[header] = value
          })

          console.log("👤 Template2 Patient data mapped:", patientData)

          // Get phone number from flexible header
          const phoneNumber = patientData[phoneNumberHeader]
          console.log("📞 Phone number extracted:", phoneNumber)

          // Skip if no phone number
          if (!phoneNumber) {
            console.log("⚠️ Skipping row - no phone number")
            continue
          }

          // Get names from flexible headers
          const firstName = patientData[firstNameHeader]
          const lastName = patientData[lastNameHeader]

          // Check call status - only process "not-called" patients
          const callStatusHeader = headers.find((h) => h === "callstatus" || h === "call status" || h === "call_status")
          const callStatus = callStatusHeader ? patientData[callStatusHeader] : ""

          if (callStatus && callStatus.toLowerCase() === "called") {
            console.log("⚠️ Skipping row - patient already called:", firstName, lastName)
            continue
          }

          // Format phone number (remove non-digits and add +)
          const cleanPhone = phoneNumber.replace(/\D/g, "")
          const formattedPhone = cleanPhone.startsWith("1") ? `+${cleanPhone}` : `+1${cleanPhone}`

          // Map to retell_llm_dynamic_variables for template2 with anesthesia fields
          const dynamicVars: any = {}
          if (firstName) dynamicVars.firstName = firstName
          if (lastName) dynamicVars.lastName = lastName

          // Map template2 specific fields
          const dobHeader = headers.find((h) => h === "dob" || h === "date of birth" || h === "dateofbirth")
          if (dobHeader && patientData[dobHeader]) dynamicVars.DOB = patientData[dobHeader]

          if (phoneNumber) dynamicVars.phoneNumber = phoneNumber

          const postAnesthesiaNotesHeader = headers.find(
            (h) => h === "postanesthesia_notes" || h === "post notes" || h === "postanesthesianotes",
          )
          if (postAnesthesiaNotesHeader && patientData[postAnesthesiaNotesHeader]) {
            dynamicVars.postAnesthesia_Notes = patientData[postAnesthesiaNotesHeader]
          }

          const postAnesthesiaPrescriptionHeader = headers.find(
            (h) =>
              h === "postanesthesia_prescription" ||
              h === "post anesthesia prescription" ||
              h === "postanesthesiaprescription",
          )
          if (postAnesthesiaPrescriptionHeader && patientData[postAnesthesiaPrescriptionHeader]) {
            dynamicVars.postAnesthesia_Prescription = patientData[postAnesthesiaPrescriptionHeader]
          }

          // Use the already declared callStatusHeader variable
          if (callStatusHeader && patientData[callStatusHeader]) {
            dynamicVars.Call_Status = patientData[callStatusHeader]
          }

          const followUpNotesHeader = headers.find(
            (h) => h === "followupnotes" || h === "followup_notes" || h === "follow up notes" || h === "followup notes",
          )
          if (followUpNotesHeader && patientData[followUpNotesHeader]) {
            dynamicVars.followUp_Notes = patientData[followUpNotesHeader]
          }

          const followUpDateHeader = headers.find(
            (h) => h === "followupdate" || h === "followup_date" || h === "follow up date" || h === "followup date",
          )
          if (followUpDateHeader && patientData[followUpDateHeader]) {
            dynamicVars.followUp_Date = patientData[followUpDateHeader]
          }

          const postFollowupStatusHeader = headers.find(
            (h) =>
              h === "postfollowupstatus" ||
              h === "postfollowup_status" ||
              h === "post followup status" ||
              h === "post followup_status",
          )
          if (postFollowupStatusHeader && patientData[postFollowupStatusHeader]) {
            dynamicVars.postFollowup_Status = patientData[postFollowupStatusHeader]
          }

          // Find outbound agent dynamically
          const outboundAgent = agents.find((agent) => agent.type === "outbound")
          const outboundPhone = phoneNumbers.find((phone) => phone.hasOutbound)

          const call: CallData = {
            from_number: outboundPhone?.phoneNumber || "+19728338727", // Dynamic outbound phone
            to_number: formattedPhone,
            agent_id: outboundAgent?.agent_id || "agent_8f58e11e169672fd4d55563b4f", // Dynamic outbound agent
            customer_name: `${firstName || ""} ${lastName || ""}`.trim(),
            metadata: {
              ...dynamicVars,
              isTemplate2: true,
              patientData: patientData,
            },
          }

          calls.push(call)
        }

        if (calls.length === 0) {
          setError("No valid patient records found in CSV")
          setIsLoading(false)
          return
        }

        // Directly make the calls for template2 users
        console.log("📞 Processing", calls.length, "Template2 patient calls directly from CSV")

        // Format calls for API
        const formattedCalls = calls.map((call) => {
          const { patientData, isTemplate2, ...dynamicVars } = call.metadata || {}

          return {
            from_number: call.from_number,
            to_number: call.to_number,
            override_agent_id: call.agent_id,
            override_agent_version: 1,
            retell_llm_dynamic_variables: dynamicVars,
            metadata: {},
          }
        })

        const result = await createBatchCalls(formattedCalls)

        // After successful batch calls, update template2 patient database
        if (result.summary && result.summary.successful > 0) {
          try {
            // Prepare patient updates for anesthesia API with correct field mapping
            const patientUpdates = calls
              .filter((call) => call.metadata?.patientData)
              .map((call) => {
                const patientData = call.metadata?.patientData

                // Check if call was registered, if not set status to not-called
                const callStatus = result.summary?.successful > 0 ? "called" : "not-called"

                // Map CSV fields to Template2 API expected fields
                return {
                  firstName: patientData.firstname || patientData["firstname"] || "",
                  lastName: patientData.lastname || patientData["lastname"] || "",
                  DOB: patientData.dob || patientData["dob"] || "",
                  phone_number: (patientData.phonenumber || patientData["phone number"] || "").replace(/\D/g, ""), // Remove non-digits
                  postTreatment_Notes: patientData.postanesthesia_notes || patientData["postanesthesia_notes"] || "",
                  postTreatment_Prescription:
                    patientData.postanesthesia_prescription || patientData["postanesthesia_prescription"] || "",
                  followUp_Appointment: "",
                  Call_Status: callStatus,
                  followUp_Notes: patientData.followup_notes || patientData["followup_notes"] || "",
                  followUp_Date: patientData.followup_date || patientData["followup_date"] || generateFollowUpDate(),
                  postFollowup_Status:
                    patientData.postfollowup_status || patientData["postfollowup_status"] || "not-called",
                  Feedback: "",
                }
              })

            if (patientUpdates.length > 0) {
              console.log("📝 Updating Template2 patient database with correct format:", patientUpdates)

              for (const patientUpdate of patientUpdates) {
                const updateResponse = await fetch(
                  "https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api/anesthesia/patients/lambda-endpoint",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      action: "manage",
                      data: patientUpdate,
                    }),
                  },
                )

                if (!updateResponse.ok) {
                  console.warn("Failed to update Template2 patient:", patientUpdate)
                } else {
                  const result = await updateResponse.json()
                  console.log("✅ Template2 Patient update result:", result)
                }
              }

              setSuccess(
                `✅ Template2 Calls completed successfully!\n📞 ${result.summary.successful}/${result.summary.total} calls created\n📝 Patient database updated for ${patientUpdates.length} patients`,
              )
            } else {
              setSuccess(
                `✅ Template2 Calls completed successfully!\n📞 ${result.summary.successful}/${result.summary.total} calls created`,
              )
            }
          } catch (updateError) {
            console.error("Failed to update Template2 patient database:", updateError)
            setSuccess(
              `✅ Template2 Calls completed successfully!\n📞 ${result.summary.successful}/${result.summary.total} calls created\n⚠️ Warning: Patient database update failed`,
            )
          }
        }

        if (result.failed_calls && result.failed_calls.length > 0) {
          setError(`Some Template2 calls failed: ${result.failed_calls.map((f: any) => f.error).join(", ")}`)
        }

        // Clear CSV data after successful processing
        setCsvData("")
      } else {
        // Regular users: Process standard call format and show in batch tab
        const requiredHeaders = ["from_number", "to_number", "agent_id"]
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

        if (missingHeaders.length > 0) {
          setError(`Missing required headers: ${missingHeaders.join(", ")}`)
          setIsLoading(false)
          return
        }

        const calls: CallData[] = []

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim())
          if (values.length !== headers.length) continue

          const call: CallData = {
            from_number: "",
            to_number: "",
            agent_id: "",
            customer_name: "",
            metadata: {},
          }

          headers.forEach((header, index) => {
            const value = values[index]
            if (header === "from_number") call.from_number = value
            else if (header === "to_number") call.to_number = value
            else if (header === "agent_id") call.agent_id = value
            else if (header === "customer_name") call.customer_name = value
            else if (call.metadata) call.metadata[header] = value
          })

          if (call.from_number && call.to_number && call.agent_id) {
            calls.push(call)
          }
        }

        setBatchCalls(calls)
        setActiveTab("batch")
        setSuccess(`Loaded ${calls.length} calls from CSV - Review and create calls in Batch tab`)
      }
    } catch (error) {
      setError("Failed to process CSV data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("Please select a CSV file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        setCsvData(content)
        setError(null)
        setSuccess(`CSV file "${file.name}" loaded successfully`)
      }
    }
    reader.onerror = () => {
      setError("Failed to read CSV file")
    }
    reader.readAsText(file)
  }

  const downloadCsvTemplate = () => {
    let template

    if (isTemplate1User) {
      // Template1 users get patient data CSV format - matching user's exact format
      template = `firstName,lastName,DOB,phone number,Treatment,postTreatment_Notes,postTreatment_Prescription,followUp_Appointment,Call Status,followUp_Notes,followUp_Date,postFollowup_Status
Ayaz,Momin,03/20/1983,96896466583,teeth cleaning,care needed on bottom left tooth,prescribed mouth wash,"06/07/2025 , 02:00 CST",not-called,[Call Summary],[Calling Date & Time],[Call Picked/ Not Picked etc]`
    } else if (isTemplate2User) {
      // Template2 users get anesthesia patient data CSV format
      template = `firstName,lastName,DOB,phone number,postAnesthesia_Notes,postAnesthesia_Prescription,Call Status,followUp_Notes,followUp_Date,postFollowup_Status
Ayaz,Momin,20/3/1983,19293900101,gave anesthesia for surgery,was told to not eat cold items,not-called,[Call Summary],[Calling Date & Time],[Call Picked/ Not Picked etc]`
    } else {
      // Regular users get standard call format
      template = "from_number,to_number,agent_id,customer_name\n+1234567890,+0987654321,agent_123,John Doe"
    }

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = isTemplate1User
      ? "patient_template.csv"
      : isTemplate2User
        ? "anesthesia_template.csv"
        : "call_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AuthenticatedLayout requiredPage="create-calls">
      <div className="space-y-6 max-w-full overflow-x-hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Outbound Calls</h1>
          <p className="text-muted-foreground">
            {isTemplate1User
              ? "Import CSV files or batch process multiple calls"
              : "Create single calls or batch process multiple calls"}
          </p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-green-600 whitespace-pre-line">{success}</p>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation - Hide Single Call tab for template users */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {!isTemplate1User && !isTemplate2User && (
            <button
              onClick={() => setActiveTab("single")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "single" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Single Call
            </button>
          )}
          {isTemplate1User ? (
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Patient History ({patients.length})
            </button>
          ) : isTemplate2User ? (
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Patient History ({template2Patients.length})
            </button>
          ) : (
            <button
              onClick={() => setActiveTab("batch")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "batch" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Batch Calls ({batchCalls.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "csv" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            CSV Import
          </button>
        </div>

        {/* Single Call Tab - Hidden for template1 users */}
        {!isTemplate1User && activeTab === "single" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                Create Single Call
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromNumber">From Number</Label>
                  {phoneNumbers.length > 0 ? (
                    <Select
                      value={singleCall.from_number}
                      onValueChange={(value) => setSingleCall({ ...singleCall, from_number: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select phone number" />
                      </SelectTrigger>
                      <SelectContent>
                        {phoneNumbers.map((phone, index) => (
                          <SelectItem key={`phone-${index}`} value={phone.phoneNumber}>
                            {phone.phoneNumber}{" "}
                            {phone.hasInbound && phone.hasOutbound
                              ? "(In/Out)"
                              : phone.hasInbound
                                ? "(Inbound)"
                                : "(Outbound)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="fromNumber"
                      value={singleCall.from_number}
                      onChange={(e) => setSingleCall({ ...singleCall, from_number: e.target.value })}
                      placeholder="+1234567890"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="toNumber">To Number</Label>
                  <Input
                    id="toNumber"
                    value={singleCall.to_number}
                    onChange={(e) => setSingleCall({ ...singleCall, to_number: e.target.value })}
                    placeholder="+0987654321"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agent">Agent</Label>
                  <Select
                    value={singleCall.agent_id}
                    onValueChange={(value) => setSingleCall({ ...singleCall, agent_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.agent_id} value={agent.agent_id}>
                          {agent.agent_name || agent.agent_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customerName">Customer Name (Optional)</Label>
                  <Input
                    id="customerName"
                    value={singleCall.customer_name}
                    onChange={(e) => setSingleCall({ ...singleCall, customer_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <Button onClick={handleSingleCall} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Call...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Create Call
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Batch Calls Tab */}
        {activeTab === "batch" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5" />
                  Batch Calls ({batchCalls.length})
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addBatchCall}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Call
                  </Button>
                  {batchCalls.length > 0 && (
                    <Button onClick={handleBatchCalls} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Create All Calls
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {batchCalls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No calls added yet</p>
                  <Button variant="outline" onClick={addBatchCall} className="mt-2 bg-transparent">
                    Add First Call
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {batchCalls.map((call, index) => (
                    <div key={`batch-call-${index}`} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">Call {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBatchCall(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>From Number</Label>
                          <Input
                            value={call.from_number}
                            onChange={(e) => updateBatchCall(index, "from_number", e.target.value)}
                            placeholder="+1234567890"
                          />
                        </div>
                        <div>
                          <Label>To Number</Label>
                          <Input
                            value={call.to_number}
                            onChange={(e) => updateBatchCall(index, "to_number", e.target.value)}
                            placeholder="+0987654321"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Agent</Label>
                          <Select
                            value={call.agent_id}
                            onValueChange={(value) => updateBatchCall(index, "agent_id", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((agent) => (
                                <SelectItem key={`batch-${index}-${agent.agent_id}`} value={agent.agent_id}>
                                  {agent.agent_name || agent.agent_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Customer Name</Label>
                          <Input
                            value={call.customer_name}
                            onChange={(e) => updateBatchCall(index, "customer_name", e.target.value)}
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Patient History Tab - Only for Template1 users */}
        {isTemplate1User && activeTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5" />
                  Patient History ({patients.length})
                </div>
                <Button variant="outline" onClick={loadPatientHistory} disabled={loadingPatients}>
                  {loadingPatients ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, phone, treatment, or patient ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
             
              </div>

              {loadingPatients ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading patient history...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{patients.length === 0 ? "No patient records found" : "No patients match your search criteria"}</p>
                  {searchTerm && (
                    <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-2">
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  {/* Perfect Table Design with Enhanced Styling */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-900">Patient Records</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Showing {filteredPatients.length} of {patients.length} patients
                        {searchTerm && ` matching "${searchTerm}"`}
                        {statusFilter !== "all" && ` with status "${statusFilter}"`}
                      </p>
                    </div>

                    {/* Scrollable Table Container */}
                    <div
                      className="overflow-auto max-h-[600px]"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#3B82F6 #F1F5F9",
                      }}
                    >
                      

                      <table className="w-full table-fixed" style={{ minWidth: "1600px" }}>
                        <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                          <tr>
                            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>First Name</span>
                              </div>
                            </th>
                            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Last Name</span>
                              </div>
                            </th>
                            <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>DOB</span>
                              </div>
                            </th>
                            <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <PhoneCall className="w-3 h-3" />
                                <span>Phone</span>
                              </div>
                            </th>
                            <th className="w-[110px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Status</span>
                              </div>
                            </th>
                            <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Treatment</span>
                              </div>
                            </th>
                            <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Post Treatment Notes</span>
                              </div>
                            </th>
                            <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Prescription</span>
                              </div>
                            </th>
                            <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Follow Up Appt</span>
                              </div>
                            </th>
                            <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Follow Up Notes</span>
                              </div>
                            </th>
                            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Follow Up Date</span>
                              </div>
                            </th>
                            <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Post Status</span>
                              </div>
                            </th>
                            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center space-x-1">
                                <span>Feedback</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredPatients.map((patient, index) => (
                            <tr
                              key={`patient-${patient.patient_id || index}`}
                              className="hover:bg-blue-50/50 transition-colors duration-150"
                            >
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="flex items-center">
                                  <div
                                    className="text-sm font-medium text-gray-900 truncate"
                                    title={patient.firstName || "N/A"}
                                  >
                                    {patient.firstName || "N/A"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm font-medium text-gray-900 truncate"
                                  title={patient.last_name || "N/A"}
                                >
                                  {patient.last_name || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700 whitespace-nowrap" title={patient.DOB || "N/A"}>
                                  {patient.DOB || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm font-mono text-gray-900 truncate"
                                  title={patient.phone_number || "N/A"}
                                >
                                  {patient.phone_number || "N/A"}
                                </div>
                              </td>
                             
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700 truncate" title={patient.Treatment || "N/A"}>
                                  {patient.Treatment || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700">
                                  <div className="truncate" title={patient.postTreatment_Notes || "N/A"}>
                                    {patient.postTreatment_Notes
                                      ? String(patient.postTreatment_Notes).length > 40
                                        ? `${String(patient.postTreatment_Notes).substring(0, 40)}...`
                                        : String(patient.postTreatment_Notes)
                                      : "N/A"}
                                  </div>
                                  {patient.postTreatment_Notes && String(patient.postTreatment_Notes).length > 40 && (
                                    <button
                                      type="button"
                                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 flex items-center space-x-1"
                                      onClick={() =>
                                        openNotesDialog(
                                          `Post Treatment Notes - ${patient.firstName || ""} ${patient.last_name || ""}`.trim(),
                                          String(patient.postTreatment_Notes),
                                        )
                                      }
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View Full</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700">
                                  <div className="truncate" title={patient.postTreatment_Prescription || "N/A"}>
                                    {patient.postTreatment_Prescription
                                      ? String(patient.postTreatment_Prescription).length > 40
                                        ? `${String(patient.postTreatment_Prescription).substring(0, 40)}...`
                                        : String(patient.postTreatment_Prescription)
                                      : "N/A"}
                                  </div>
                                  {patient.postTreatment_Prescription &&
                                    String(patient.postTreatment_Prescription).length > 40 && (
                                      <button
                                        type="button"
                                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 flex items-center space-x-1"
                                        onClick={() =>
                                          openNotesDialog(
                                            `Prescription - ${patient.firstName || ""} ${patient.last_name || ""}`.trim(),
                                            String(patient.postTreatment_Prescription),
                                          )
                                        }
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>View Full</span>
                                      </button>
                                    )}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm text-gray-700 truncate"
                                  title={patient.followUp_Appointment || "N/A"}
                                >
                                  {patient.followUp_Appointment || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700">
                                  <div className="truncate" title={patient.followUp_Notes || "N/A"}>
                                    {patient.followUp_Notes
                                      ? String(patient.followUp_Notes).length > 40
                                        ? `${String(patient.followUp_Notes).substring(0, 40)}...`
                                        : String(patient.followUp_Notes)
                                      : "N/A"}
                                  </div>
                                  {patient.followUp_Notes && String(patient.followUp_Notes).length > 40 && (
                                    <button
                                      type="button"
                                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 flex items-center space-x-1"
                                      onClick={() =>
                                        openNotesDialog(
                                          `Follow Up Notes - ${patient.firstName || ""} ${patient.last_name || ""}`.trim(),
                                          String(patient.followUp_Notes),
                                        )
                                      }
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View Full</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm text-gray-700 truncate"
                                  title={patient.updated_at ? new Date(patient.updated_at).toLocaleDateString() : "N/A"}
                                >
                                  {patient.updated_at ? new Date(patient.updated_at).toLocaleDateString() : "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm text-gray-700 truncate"
                                  title={patient.postFollowup_Status || "N/A"}
                                >
                                  {patient.postFollowup_Status || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-700">
                                  <div className="truncate" title={patient.Feedback || "N/A"}>
                                    {patient.Feedback
                                      ? String(patient.Feedback).length > 30
                                        ? `${String(patient.Feedback).substring(0, 30)}...`
                                        : String(patient.Feedback)
                                      : "N/A"}
                                  </div>
                                  {patient.Feedback && String(patient.Feedback).length > 30 && (
                                    <button
                                      type="button"
                                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 flex items-center space-x-1"
                                      onClick={() =>
                                        openNotesDialog(
                                          `Feedback - ${patient.firstName || ""} ${patient.last_name || ""}`.trim(),
                                          String(patient.Feedback),
                                        )
                                      }
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View Full</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                   
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Patient History Tab - For Template2 users */}
        {isTemplate2User && activeTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5" />
                  Template2 Patient History ({template2Patients.length})
                </div>
                <Button variant="outline" onClick={loadTemplate2PatientHistory} disabled={loadingTemplate2Patients}>
                  {loadingTemplate2Patients ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, phone, or patient ID..."
                      value={template2SearchTerm}
                      onChange={(e) => setTemplate2SearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
               
              </div>

              {loadingTemplate2Patients ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading template2 patient history...</p>
                </div>
              ) : filteredTemplate2Patients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>
                    {template2Patients.length === 0
                      ? "No patient records found"
                      : "No patients match your search criteria"}
                  </p>
                  {template2SearchTerm && (
                    <Button variant="outline" onClick={() => setTemplate2SearchTerm("")} className="mt-2">
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  {/* Perfect Table Design for Template2 */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 px-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-900"> Patient Records</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Showing {filteredTemplate2Patients.length} of {template2Patients.length} patients
                        {template2SearchTerm && ` matching "${template2SearchTerm}"`}
                        {template2StatusFilter !== "all" && ` with status "${template2StatusFilter}"`}
                      </p>
                    </div>

                    {/* Scrollable Table Container */}
                    <div
                      className="overflow-auto max-h-[600px] table-container"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#8B5CF6 #F1F5F9",
                      }}
                    >
                      <table className="w-full table-fixed" style={{ minWidth: "1400px" }}>
                        <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                          <tr>
                            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>First Name</span>
                              </div>
                            </th>
                            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Last Name</span>
                              </div>
                            </th>
                            <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>DOB</span>
                              </div>
                            </th>
                            <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <PhoneCall className="w-3 h-3" />
                                <span>Phone</span>
                              </div>
                            </th>
                            <th className="w-[110px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Status</span>
                              </div>
                            </th>
                            <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Post Notes</span>
                              </div>
                            </th>
                            <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Prescription</span>
                              </div>
                            </th>
                            <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Follow Up Notes</span>
                              </div>
                            </th>
                            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Follow Up Date</span>
                              </div>
                            </th>
                            <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                              <div className="flex items-center space-x-1">
                                <span>Post Status</span>
                              </div>
                            </th>
                            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center space-x-1">
                                <span>Feedback</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredTemplate2Patients.map((patient, index) => (
                            <tr
                              key={`template2-patient-${patient.patient_id || index}`}
                              className="hover:bg-purple-50/50 transition-colors duration-150"
                            >
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm font-medium text-gray-900 truncate"
                                  title={patient.firstName || "N/A"}
                                >
                                  {patient.firstName || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm font-medium text-gray-900 truncate"
                                  title={patient.lastName || "N/A"}
                                >
                                  {patient.lastName || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700 whitespace-nowrap" title={patient.DOB || "N/A"}>
                                  {patient.DOB || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm font-mono text-gray-900 truncate"
                                  title={patient.phoneNumber || "N/A"}
                                >
                                  {patient.phoneNumber || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-medium px-2 py-1 rounded-full border ${
                                    patient.Call_Status === "called"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : patient.Call_Status === "failed"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  }`}
                                >
                                  {patient.Call_Status === "called"
                                    ? "✅ Called"
                                    : patient.Call_Status === "failed"
                                      ? "❌ Failed"
                                      : "⏳ Not Called"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700">
                                  <div className="truncate" title={patient.postTreatment_Notes || "N/A"}>
                                    {patient.postTreatment_Notes
                                      ? String(patient.postTreatment_Notes).length > 40
                                        ? `${String(patient.postTreatment_Notes).substring(0, 40)}...`
                                        : String(patient.postTreatment_Notes)
                                      : "N/A"}
                                  </div>
                                  {patient.postTreatment_Notes && String(patient.postTreatment_Notes).length > 40 && (
                                    <button
                                      type="button"
                                      className="text-xs text-purple-600 hover:text-purple-800 hover:underline mt-1 flex items-center space-x-1"
                                      onClick={() =>
                                        openNotesDialog(
                                          `Post Notes - ${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
                                          String(patient.postTreatment_Notes),
                                        )
                                      }
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View Full</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700">
                                  <div className="truncate" title={patient.postTreatment_Prescription || "N/A"}>
                                    {patient.postTreatment_Prescription
                                      ? String(patient.postTreatment_Prescription).length > 40
                                        ? `${String(patient.postTreatment_Prescription).substring(0, 40)}...`
                                        : String(patient.postTreatment_Prescription)
                                      : "N/A"}
                                  </div>
                                  {patient.postTreatment_Prescription &&
                                    String(patient.postTreatment_Prescription).length > 40 && (
                                      <button
                                        type="button"
                                        className="text-xs text-purple-600 hover:text-purple-800 hover:underline mt-1 flex items-center space-x-1"
                                        onClick={() =>
                                          openNotesDialog(
                                            `Prescription - ${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
                                            String(patient.postTreatment_Prescription),
                                          )
                                        }
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>View Full</span>
                                      </button>
                                    )}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div className="text-sm text-gray-700">
                                  <div className="truncate" title={patient.followUp_Notes || "N/A"}>
                                    {patient.followUp_Notes
                                      ? String(patient.followUp_Notes).length > 40
                                        ? `${String(patient.followUp_Notes).substring(0, 40)}...`
                                        : String(patient.followUp_Notes)
                                      : "N/A"}
                                  </div>
                                  {patient.followUp_Notes && String(patient.followUp_Notes).length > 40 && (
                                    <button
                                      type="button"
                                      className="text-xs text-purple-600 hover:text-purple-800 hover:underline mt-1 flex items-center space-x-1"
                                      onClick={() =>
                                        openNotesDialog(
                                          `Follow Up Notes - ${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
                                          String(patient.followUp_Notes),
                                        )
                                      }
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View Full</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm text-gray-700 truncate"
                                  title={patient.updated_at ? new Date(patient.updated_at).toLocaleDateString() : "N/A"}
                                >
                                  {patient.updated_at ? new Date(patient.updated_at).toLocaleDateString() : "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-gray-100">
                                <div
                                  className="text-sm text-gray-700 truncate"
                                  title={patient.postFollowup_Status || "N/A"}
                                >
                                  {patient.postFollowup_Status || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-700">
                                  <div className="truncate" title={patient.Feedback || "N/A"}>
                                    {patient.Feedback
                                      ? String(patient.Feedback).length > 30
                                        ? `${String(patient.Feedback).substring(0, 30)}...`
                                        : String(patient.Feedback)
                                      : "N/A"}
                                  </div>
                                  {patient.Feedback && String(patient.Feedback).length > 30 && (
                                    <button
                                      type="button"
                                      className="text-xs text-purple-600 hover:text-purple-800 hover:underline mt-1 flex items-center space-x-1"
                                      onClick={() =>
                                        openNotesDialog(
                                          `Feedback - ${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
                                          String(patient.Feedback),
                                        )
                                      }
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View Full</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

             
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CSV Import Tab */}
        {activeTab === "csv" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  CSV Import
                </div>
                <Button variant="outline" onClick={downloadCsvTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Option */}
              <div className="space-y-3">
                <Label>Upload CSV File</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csvFileInput" />
                  <label htmlFor="csvFileInput" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-1">Click to upload CSV file or drag and drop</p>
                    <p className="text-xs text-gray-500">
                      {isTemplate1User ? "Patient data CSV format only" : "CSV files only"}
                    </p>
                  </label>
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste CSV data</span>
                </div>
              </div>

           
          

              <div className="flex gap-3">
                <Button onClick={processCsvData} className="flex-1" disabled={!csvData.trim()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Process CSV Data
                </Button>
                {batchCalls.length > 0 && (
                  <Button onClick={handleBatchCalls} disabled={isLoading} variant="default">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Making Calls...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Make Calls ({batchCalls.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

    

     
      </div>

      {/* Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{notesDialogTitle}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words text-sm">
            {notesDialogContent || "N/A"}
          </div>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  )
}
