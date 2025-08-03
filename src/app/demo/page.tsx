"use client"

import { useState } from 'react'
import { AuthenticatedLayout } from '@/app/components/AuthenticatedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { getNumber, getNumbers, validateNumber } from '@/lib/aws-api'

export default function DemoPage() {
  const [singleNumber, setSingleNumber] = useState<string>('')
  const [multipleNumbers, setMultipleNumbers] = useState<string[]>([])
  const [numberType, setNumberType] = useState<'from' | 'to'>('to')
  const [numberFormat, setNumberFormat] = useState<'us' | 'international'>('us')
  const [count, setCount] = useState<number>(5)
  const [validationInput, setValidationInput] = useState<string>('')
  const [validationResult, setValidationResult] = useState<any>(null)

  const generateSingleNumber = () => {
    const number = getNumber(numberType, numberFormat)
    setSingleNumber(number)
  }

  const generateMultipleNumbers = () => {
    const numbers = getNumbers(count, numberType, numberFormat)
    setMultipleNumbers(numbers)
  }

  const validatePhoneNumber = () => {
    if (validationInput.trim()) {
      const result = validateNumber(validationInput.trim())
      setValidationResult(result)
    }
  }

  const clearValidation = () => {
    setValidationInput('')
    setValidationResult(null)
  }

  return (
    <AuthenticatedLayout requiredPage="demo">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demo Functions</h1>
          <p className="text-muted-foreground">
            Test the getNumber() demo functions and phone number utilities
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Single Number Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Single Number Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Number Type</Label>
                  <Select value={numberType} onValueChange={(value: 'from' | 'to') => setNumberType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="from">From Number</SelectItem>
                      <SelectItem value="to">To Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select value={numberFormat} onValueChange={(value: 'us' | 'international') => setNumberFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">US Format</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={generateSingleNumber} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Number
              </Button>

              {singleNumber && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Generated Number:</Label>
                  <div className="font-mono text-lg mt-1">{singleNumber}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Multiple Numbers Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Batch Number Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="count">Count</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                  />
                </div>
                <div>
                  <Label htmlFor="batch-type">Type</Label>
                  <Select value={numberType} onValueChange={(value: 'from' | 'to') => setNumberType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="from">From</SelectItem>
                      <SelectItem value="to">To</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="batch-format">Format</Label>
                  <Select value={numberFormat} onValueChange={(value: 'us' | 'international') => setNumberFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">US</SelectItem>
                      <SelectItem value="international">Intl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={generateMultipleNumbers} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate {count} Numbers
              </Button>

              {multipleNumbers.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <Label className="text-sm font-medium">Generated Numbers:</Label>
                  {multipleNumbers.map((number, index) => (
                    <div key={index} className="font-mono text-sm p-2 bg-muted rounded">
                      {index + 1}. {number}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Phone Number Validator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Phone Number Validator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter phone number to validate (e.g., +15551234567)"
                value={validationInput}
                onChange={(e) => setValidationInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={validatePhoneNumber} disabled={!validationInput.trim()}>
                Validate
              </Button>
              {validationResult && (
                <Button variant="outline" onClick={clearValidation}>
                  Clear
                </Button>
              )}
            </div>

            {validationResult && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  {validationResult.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {validationResult.isValid ? 'Valid Number' : 'Invalid Number'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Format:</Label>
                    <Badge variant={validationResult.isValid ? 'default' : 'destructive'}>
                      {validationResult.format}
                    </Badge>
                  </div>
                  {validationResult.country && (
                    <div>
                      <Label className="text-muted-foreground">Country:</Label>
                      <div className="font-medium">{validationResult.country}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <Label className="font-medium">Import the functions:</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg overflow-x-auto">
{`import { getNumber, getNumbers, validateNumber } from '@/lib/aws-api'`}
                </pre>
              </div>

              <div>
                <Label className="font-medium">Generate a single number:</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg overflow-x-auto">
{`// Generate US format 'to' number
const number = getNumber('to', 'us')

// Generate international 'from' number  
const fromNumber = getNumber('from', 'international')`}
                </pre>
              </div>

              <div>
                <Label className="font-medium">Generate multiple numbers:</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg overflow-x-auto">
{`// Generate 10 US format numbers
const numbers = getNumbers(10, 'to', 'us')

// Generate 5 international numbers
const intlNumbers = getNumbers(5, 'from', 'international')`}
                </pre>
              </div>

              <div>
                <Label className="font-medium">Validate a number:</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg overflow-x-auto">
{`const result = validateNumber('+15551234567')
// Returns: { isValid: true, format: 'us', country: 'United States' }`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
