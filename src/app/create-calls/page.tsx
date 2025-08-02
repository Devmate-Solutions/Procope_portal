"use client"

import { useEffect, useState } from 'react'
import { AuthenticatedLayout } from '@/app/components/AuthenticatedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PhoneCall, Upload, Download, Plus, Trash2, Play } from 'lucide-react'
import { createCall, createBatchCalls, getAgents } from '@/lib/aws-api'
import { getCurrentUser } from '@/lib/auth'

interface CallData {
  from_number: string
  to_number: string
  agent_id: string
  customer_name?: string
  metadata?: Record<string, any>
}

export default function CreateCallsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Single call form
  const [singleCall, setSingleCall] = useState<CallData>({
    from_number: '',
    to_number: '',
    agent_id: '',
    customer_name: '',
    metadata: {}
  })

  // Batch calls
  const [batchCalls, setBatchCalls] = useState<CallData[]>([])
  const [csvData, setCsvData] = useState('')
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'csv'>('single')

  const currentUser = getCurrentUser()

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      const agentsData = await getAgents()
      setAgents(Array.isArray(agentsData) ? agentsData : [])
    } catch (error) {
      console.error('Failed to load agents:', error)
      setError('Failed to load agents')
    }
  }

  const handleSingleCall = async () => {
    try {
      if (!singleCall.from_number || !singleCall.to_number || !singleCall.agent_id) {
        setError('From number, to number, and agent are required')
        return
      }

      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const callData = {
        from_number: singleCall.from_number,
        to_number: singleCall.to_number,
        agent_id: singleCall.agent_id,
        retell_llm_dynamic_variables: singleCall.customer_name ? {
          customer_name: singleCall.customer_name
        } : {},
        metadata: singleCall.metadata || {}
      }

      const result = await createCall(callData)
      setSuccess(`Call created successfully! Call ID: ${result.call_id}`)
      
      // Reset form
      setSingleCall({
        from_number: '',
        to_number: '',
        agent_id: '',
        customer_name: '',
        metadata: {}
      })

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create call')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBatchCalls = async () => {
    try {
      if (batchCalls.length === 0) {
        setError('No calls to process')
        return
      }

      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const formattedCalls = batchCalls.map(call => ({
        from_number: call.from_number,
        to_number: call.to_number,
        agent_id: call.agent_id,
        retell_llm_dynamic_variables: call.customer_name ? {
          customer_name: call.customer_name
        } : {},
        metadata: call.metadata || {}
      }))

      const result = await createBatchCalls(formattedCalls)
      
      if (result.summary) {
        setSuccess(`Batch completed:${result.summary.successful}/${result.summary.total} calls created successfully`)
        
        if (result.failed_calls && result.failed_calls.length > 0) {
          setError(`Some calls failed: ${result.failed_calls.map(f => f.error).join(', ')}`)
        }
      } else {
        setSuccess('Batch calls created successfully!')
      }

      // Reset batch calls
      setBatchCalls([])

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create batch calls')
    } finally {
      setIsLoading(false)
    }
  }

  const addBatchCall = () => {
    setBatchCalls([...batchCalls, {
      from_number: '',
      to_number: '',
      agent_id: '',
      customer_name: '',
      metadata: {}
    }])
  }

  const updateBatchCall = (index: number, field: keyof CallData, value: string) => {
    const updated = [...batchCalls]
    updated[index] = { ...updated[index], [field]: value }
    setBatchCalls(updated)
  }

  const removeBatchCall = (index: number) => {
    setBatchCalls(batchCalls.filter((_, i) => i !== index))
  }

  const processCsvData = () => {
    try {
      if (!csvData.trim()) {
        setError('Please enter CSV data')
        return
      }

      const lines = csvData.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Validate headers
      const requiredHeaders = ['from_number', 'to_number', 'agent_id']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        setError(`Missing required headers: ${missingHeaders.join(', ')}`)
        return
      }

      const calls: CallData[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length !== headers.length) continue
        
        const call: CallData = {
          from_number: '',
          to_number: '',
          agent_id: '',
          customer_name: '',
          metadata: {}
        }
        
        headers.forEach((header, index) => {
          const value = values[index]
          if (header === 'from_number') call.from_number = value
          else if (header === 'to_number') call.to_number = value
          else if (header === 'agent_id') call.agent_id = value
          else if (header === 'customer_name') call.customer_name = value
          else if (call.metadata) call.metadata[header] = value
        })
        
        if (call.from_number && call.to_number && call.agent_id) {
          calls.push(call)
        }
      }
      
      setBatchCalls(calls)
      setActiveTab('batch')
      setSuccess(`Loaded ${calls.length} calls from CSV`)
      
    } catch (error) {
      setError('Failed to process CSV data')
    }
  }

  const downloadCsvTemplate = () => {
    const template = 'from_number,to_number,agent_id,customer_name\n+1234567890,+0987654321,agent_123,John Doe'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'call_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AuthenticatedLayout requiredPage="create-calls">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Outbound Calls</h1>
          <p className="text-muted-foreground">
            Create single calls or batch process multiple calls
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

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'single' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Single Call
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'batch' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Batch Calls ({batchCalls.length})
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'csv' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            CSV Import
          </button>
        </div>

        {/* Single Call Tab */}
        {activeTab === 'single' && (
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
                  <Input
                    id="fromNumber"
                    value={singleCall.from_number}
                    onChange={(e) => setSingleCall({ ...singleCall, from_number: e.target.value })}
                    placeholder="+1234567890"
                  />
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

              <Button 
                onClick={handleSingleCall} 
                disabled={isLoading}
                className="w-full"
              >
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
        {activeTab === 'batch' && (
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
                  <Button variant="outline" onClick={addBatchCall} className="mt-2">
                    Add First Call
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {batchCalls.map((call, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
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
                            onChange={(e) => updateBatchCall(index, 'from_number', e.target.value)}
                            placeholder="+1234567890"
                          />
                        </div>
                        <div>
                          <Label>To Number</Label>
                          <Input
                            value={call.to_number}
                            onChange={(e) => updateBatchCall(index, 'to_number', e.target.value)}
                            placeholder="+0987654321"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Agent</Label>
                          <Select 
                            value={call.agent_id} 
                            onValueChange={(value) => updateBatchCall(index, 'agent_id', value)}
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
                          <Label>Customer Name</Label>
                          <Input
                            value={call.customer_name}
                            onChange={(e) => updateBatchCall(index, 'customer_name', e.target.value)}
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

        {/* CSV Import Tab */}
        {activeTab === 'csv' && (
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
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csvData">CSV Data</Label>
                <Textarea
                  id="csvData"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="from_number,to_number,agent_id,customer_name
+1234567890,+0987654321,agent_123,John Doe
+1234567891,+0987654322,agent_123,Jane Smith"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p><strong>Required columns:</strong> from_number, to_number, agent_id</p>
                <p><strong>Optional columns:</strong> customer_name, any custom metadata</p>
              </div>

              <Button onClick={processCsvData} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Process CSV Data
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Available Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Available Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.length > 0 ? (
                agents.map((agent) => (
                  <div key={agent.agent_id} className="p-3 border rounded-lg">
                    <div className="font-medium">{agent.agent_name || 'Unnamed Agent'}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {agent.agent_id}
                    </div>
                    {agent.voice_id && (
                      <div className="text-xs text-muted-foreground">
                        Voice: {agent.voice_id}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-4 text-muted-foreground">
                  No agents available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
