'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  Loader2,
  Download,
  FileJson,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  AlertCircle,
  Home,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface ExportRequest {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  export_format: 'json' | 'csv'
  download_url: string | null
  expires_at: string | null
  created_at: string
  completed_at: string | null
  error_message: string | null
}

export default function ExportDataPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([])

  const loadExportRequests = async (uid: string) => {
    const { data } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setExportRequests(data)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      await loadExportRequests(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const requestExport = async (format: 'json' | 'csv') => {
    if (!userId) return

    setRequesting(true)
    try {
      const { data, error } = await supabase
        .from('data_export_requests')
        .insert({
          user_id: userId,
          export_format: format,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Export requested', {
        description: 'Your data export is being prepared. This may take a few minutes.',
      })

      await loadExportRequests(userId)
    } catch (error) {
      console.error('Export request error:', error)
      toast.error('Failed to request export')
    } finally {
      setRequesting(false)
    }
  }

  const getStatusBadge = (status: ExportRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Ready
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="outline" className="gap-1">
            Expired
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Export Your Data</h1>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Info */}
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">Download your data</h2>
            <p className="text-muted-foreground">
              You can request a copy of all your personal data stored on ComeOnUnity.
              This includes your profile information, community memberships, items,
              bookings, and activity history.
            </p>
          </div>
        </div>
      </Card>

      {/* Export Options */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Choose format</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => requestExport('json')}
            disabled={requesting}
            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
          >
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileJson className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">JSON Format</p>
              <p className="text-sm text-muted-foreground">
                Machine-readable format
              </p>
            </div>
          </button>

          <button
            onClick={() => requestExport('csv')}
            disabled={requesting}
            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
          >
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium">CSV Format</p>
              <p className="text-sm text-muted-foreground">
                Spreadsheet compatible
              </p>
            </div>
          </button>
        </div>
        {requesting && (
          <div className="flex items-center gap-2 mt-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Requesting export...
          </div>
        )}
      </Card>

      {/* Previous Exports */}
      {exportRequests.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent exports</h2>
          <div className="space-y-3">
            {exportRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {request.export_format === 'json' ? (
                    <FileJson className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {request.export_format.toUpperCase()} Export
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(request.status)}
                  {request.status === 'completed' && request.download_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={request.download_url} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Download links expire after 7 days for security reasons.
          </p>
        </Card>
      )}
    </div>
  )
}
