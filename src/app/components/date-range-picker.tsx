"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown, CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"

interface DateRangePickerProps {
  value: string
  onChange: (value: string, dateRange?: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // Initialize with default date range (Last 4 weeks)
  useEffect(() => {
    if (!dateRange && value === "All time") {
      // For "All time", use a comprehensive range from 2020 to present
      const allTimeStart = new Date(2020, 0, 1) // January 1, 2020
      const allTimeEnd = new Date() // Current date
      allTimeEnd.setHours(23, 59, 59, 999) // End of current day
      const allTimeRange = { from: allTimeStart, to: allTimeEnd }
      setDateRange(allTimeRange)
      onChange("All time", allTimeRange)
    }
  }, [])

  const presetRanges = [
    { label: "Today", days: 0 },
    { label: "Yesterday", days: 1 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 14 days", days: 14 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "Week to date", days: -1 },
    { label: "Month to date", days: -2 },
    { label: "Year to date", days: -3 },
    { label: "All time", days: -4 },
  ]

  const getDateRangeForPreset = (preset: string, days: number): DateRange | undefined => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to beginning of current day
    const startOfToday = new Date(today)

    switch (days) {
      case 0: // Today
        return { from: startOfToday, to: startOfToday }
      case -1: // Week to date
        const startOfWeek = new Date(startOfToday)
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()) // Sunday
        return { from: startOfWeek, to: startOfToday }
      case -2: // Month to date
        const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1)
        return { from: startOfMonth, to: startOfToday }
      case -3: // Year to date
        const startOfYear = new Date(startOfToday.getFullYear(), 0, 1)
        return { from: startOfYear, to: startOfToday }
      case -4: // All time - Use a comprehensive range from 2020 to present
        const allTimeStart = new Date(2020, 0, 1) // January 1, 2020
        const allTimeEnd = new Date() // Current date
        allTimeEnd.setHours(23, 59, 59, 999) // End of current day
        return { from: allTimeStart, to: allTimeEnd }
      default: // Last X days
        const startDate = new Date(startOfToday)
        startDate.setDate(startOfToday.getDate() - days)
        return { from: startDate, to: startOfToday }
    }
  }

  const handlePresetSelect = (preset: string, days: number) => {
    const range = getDateRangeForPreset(preset, days)
    setDateRange(range)
    onChange(preset, range)
    setIsOpen(false)
  }

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      // If selecting a future date, adjust to today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const from = range.from > today ? today : range.from
      const to = range.to > today ? today : range.to

      const adjustedRange = { from, to }
      const label = `${format(from, "MMM dd")} - ${format(to, "MMM dd")}`
      onChange(label, adjustedRange)
    }
  }

  const formatDisplayValue = () => {
    if (dateRange?.from && dateRange?.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, "MMM dd, yyyy")
      }
      return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
    }
    return value
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[200px]" size={undefined}>
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {formatDisplayValue()}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="flex">
          {/* Preset ranges sidebar */}
          <div className="border-r p-3 w-96 space-y-1 ">
            <div className="text-sm font-medium text-gray-900 mb-2">Quick Select</div>
            {presetRanges.map((range) => (
              <Button
                key={range.label}
                variant={value === range.label ? "secondary" : "ghost"}
                className="w-full justify-start text-sm h-8"
                onClick={() => handlePresetSelect(range.label, range.days)}
                size={undefined}
              >
                {range.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleCustomDateSelect}
              numberOfMonths={2}
              className="rounded-md"
              disabled={{ after: new Date() }}
              defaultMonth={dateRange?.from || new Date()}
            />
            <div className="flex items-center justify-between pt-3 border-t mt-3">
              <span className="text-sm text-gray-600">
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
                  : "Select date range"}
              </span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className={undefined}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={!dateRange?.from || !dateRange?.to}
                  className={undefined}
                  variant={undefined}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
