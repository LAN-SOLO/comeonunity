'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, Calendar as CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface AuditLogFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  actionType: string
  onActionTypeChange: (value: string) => void
  resourceType: string
  onResourceTypeChange: (value: string) => void
  severity: string
  onSeverityChange: (value: string) => void
  dateFrom: Date | undefined
  onDateFromChange: (date: Date | undefined) => void
  dateTo: Date | undefined
  onDateToChange: (date: Date | undefined) => void
  onReset: () => void
}

const actionTypes = [
  { value: 'all', label: 'All Actions' },
  { value: 'auth', label: 'Authentication' },
  { value: 'member', label: 'Member' },
  { value: 'item', label: 'Item' },
  { value: 'booking', label: 'Booking' },
  { value: 'news', label: 'News' },
  { value: 'community', label: 'Community' },
  { value: 'admin', label: 'Admin' },
  { value: 'report', label: 'Report' },
]

const resourceTypes = [
  { value: 'all', label: 'All Resources' },
  { value: 'user', label: 'User' },
  { value: 'member', label: 'Member' },
  { value: 'item', label: 'Item' },
  { value: 'booking', label: 'Booking' },
  { value: 'news', label: 'News' },
  { value: 'community', label: 'Community' },
  { value: 'report', label: 'Report' },
]

const severities = [
  { value: 'all', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
]

export function AuditLogFilters({
  search,
  onSearchChange,
  actionType,
  onActionTypeChange,
  resourceType,
  onResourceTypeChange,
  severity,
  onSeverityChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
}: AuditLogFiltersProps) {
  const hasFilters =
    search ||
    actionType !== 'all' ||
    resourceType !== 'all' ||
    severity !== 'all' ||
    dateFrom ||
    dateTo

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, action, or details..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" onClick={onReset}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={actionType} onValueChange={onActionTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            {actionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={resourceType} onValueChange={onResourceTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Resource Type" />
          </SelectTrigger>
          <SelectContent>
            {resourceTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={severity} onValueChange={onSeverityChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {severities.map((sev) => (
              <SelectItem key={sev.value} value={sev.value}>
                {sev.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[160px] justify-start text-left font-normal',
                !dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, 'PP') : 'From Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={onDateFromChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[160px] justify-start text-left font-normal',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, 'PP') : 'To Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={onDateToChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
