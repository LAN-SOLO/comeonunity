'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportCard, type Report } from '@/components/moderation/report-card'
import { ResolveDialog } from '@/components/moderation/resolve-dialog'
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface Props {
  params: Promise<{ communityId: string }>
}

const PAGE_SIZE = 20

export default function CommunityReportsPage({ params }: Props) {
  const { communityId: communitySlug } = use(params)

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<string>('pending')

  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean
    report: Report | null
    action: 'resolve' | 'dismiss' | null
  }>({ open: false, report: null, action: null })

  // Counts for tabs
  const [counts, setCounts] = useState({
    pending: 0,
    reviewing: 0,
    resolved: 0,
    dismissed: 0,
  })

  const fetchCounts = async () => {
    try {
      const res = await fetch(
        `/api/communities/${communitySlug}/admin/reports?counts=true`
      )
      const data = await res.json()
      if (res.ok && data.counts) {
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Failed to fetch counts:', error)
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('status', activeTab)
      params.set('page', currentPage.toString())
      params.set('limit', PAGE_SIZE.toString())

      const res = await fetch(
        `/api/communities/${communitySlug}/admin/reports?${params}`
      )
      const data = await res.json()

      if (res.ok) {
        setReports(data.reports)
        setTotalCount(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [communitySlug])

  useEffect(() => {
    fetchReports()
  }, [communitySlug, activeTab, currentPage])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  const handleReview = async (report: Report) => {
    try {
      const res = await fetch(
        `/api/communities/${communitySlug}/admin/reports/${report.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'review' }),
        }
      )

      if (res.ok) {
        fetchReports()
        fetchCounts()
      }
    } catch (error) {
      console.error('Failed to start review:', error)
    }
  }

  const handleResolveOrDismiss = async (
    reportId: string,
    action: 'resolve' | 'dismiss',
    notes: string
  ) => {
    const res = await fetch(
      `/api/communities/${communitySlug}/admin/reports/${reportId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      }
    )

    if (res.ok) {
      fetchReports()
      fetchCounts()
    } else {
      throw new Error('Failed to update report')
    }
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
        <AlertTriangle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Moderation Reports</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {counts.pending > 0 && (
              <span className="ml-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {counts.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewing" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Reviewing
            {counts.reviewing > 0 && (
              <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {counts.reviewing}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Resolved
          </TabsTrigger>
          <TabsTrigger value="dismissed" className="gap-2">
            <XCircle className="h-4 w-4" />
            Dismissed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : reports.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No {activeTab} reports
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onReview={handleReview}
                  onResolve={(r) =>
                    setResolveDialog({ open: true, report: r, action: 'resolve' })
                  }
                  onDismiss={(r) =>
                    setResolveDialog({ open: true, report: r, action: 'dismiss' })
                  }
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
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
        </TabsContent>
      </Tabs>

      {/* Resolve Dialog */}
      <ResolveDialog
        open={resolveDialog.open}
        onOpenChange={(open) =>
          setResolveDialog({ open, report: null, action: null })
        }
        report={resolveDialog.report}
        action={resolveDialog.action}
        onConfirm={handleResolveOrDismiss}
      />
    </div>
  )
}
