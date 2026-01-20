'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuditLogFilters } from '@/components/admin/audit-log-filters'
import { AuditLogTable, type AuditLogEntry } from '@/components/admin/audit-log-table'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'

interface Props {
  params: Promise<{ communityId: string }>
}

const PAGE_SIZE = 50

export default function CommunityAuditLogsPage({ params }: Props) {
  const { communityId: communitySlug } = use(params)

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [actionType, setActionType] = useState('all')
  const [resourceType, setResourceType] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (actionType !== 'all') params.set('actionType', actionType)
      if (resourceType !== 'all') params.set('resourceType', resourceType)
      if (severity !== 'all') params.set('severity', severity)
      if (dateFrom) params.set('dateFrom', dateFrom.toISOString())
      if (dateTo) params.set('dateTo', dateTo.toISOString())
      params.set('page', currentPage.toString())
      params.set('limit', PAGE_SIZE.toString())

      const res = await fetch(
        `/api/communities/${communitySlug}/admin/audit-logs?${params}`
      )
      const data = await res.json()

      if (res.ok) {
        setLogs(data.logs)
        setTotalCount(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [communitySlug, search, actionType, resourceType, severity, dateFrom, dateTo, currentPage])

  const handleReset = () => {
    setSearch('')
    setActionType('all')
    setResourceType('all')
    setSeverity('all')
    setDateFrom(undefined)
    setDateTo(undefined)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/c/${communitySlug}/admin`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Audit Logs</h1>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <AuditLogFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setCurrentPage(1)
          }}
          actionType={actionType}
          onActionTypeChange={(v) => {
            setActionType(v)
            setCurrentPage(1)
          }}
          resourceType={resourceType}
          onResourceTypeChange={(v) => {
            setResourceType(v)
            setCurrentPage(1)
          }}
          severity={severity}
          onSeverityChange={(v) => {
            setSeverity(v)
            setCurrentPage(1)
          }}
          dateFrom={dateFrom}
          onDateFromChange={(d) => {
            setDateFrom(d)
            setCurrentPage(1)
          }}
          dateTo={dateTo}
          onDateToChange={(d) => {
            setDateTo(d)
            setCurrentPage(1)
          }}
          onReset={handleReset}
        />
      </Card>

      {/* Logs Table */}
      <Card>
        <AuditLogTable logs={logs} loading={loading} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
