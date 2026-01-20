'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertTriangle,
  MessageSquare,
  User,
  Package,
  Newspaper,
  Calendar,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'

export interface Report {
  id: string
  community_id: string
  reporter_id: string | null
  target_type: 'member' | 'item' | 'news' | 'comment' | 'booking'
  target_id: string
  reason: 'spam' | 'harassment' | 'inappropriate' | 'dangerous' | 'other'
  description: string | null
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  resolved_by: string | null
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
  reporter?: {
    display_name: string
    avatar_url: string | null
  } | null
  resolver?: {
    display_name: string
  } | null
}

interface ReportCardProps {
  report: Report
  onResolve: (report: Report) => void
  onDismiss: (report: Report) => void
  onReview: (report: Report) => void
}

const targetIcons = {
  member: User,
  item: Package,
  news: Newspaper,
  comment: MessageSquare,
  booking: Calendar,
}

const reasonLabels = {
  spam: 'Spam',
  harassment: 'Harassment',
  inappropriate: 'Inappropriate Content',
  dangerous: 'Dangerous/Harmful',
  other: 'Other',
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
  reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30',
  dismissed: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30',
}

export function ReportCard({ report, onResolve, onDismiss, onReview }: ReportCardProps) {
  const TargetIcon = targetIcons[report.target_type] || AlertTriangle
  const isActionable = report.status === 'pending' || report.status === 'reviewing'

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
          <TargetIcon className="h-5 w-5 text-red-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusColors[report.status]}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </Badge>
                <Badge variant="outline">
                  {report.target_type.charAt(0).toUpperCase() + report.target_type.slice(1)}
                </Badge>
                <Badge variant="destructive">
                  {reasonLabels[report.reason]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Report #{report.id.slice(0, 8)}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(report.created_at), 'MMM d, HH:mm')}
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <p className="text-sm mb-3 bg-muted/50 p-2 rounded">
              {report.description}
            </p>
          )}

          {/* Reporter */}
          {report.reporter && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Reported by:</span>
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={report.reporter.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {report.reporter.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{report.reporter.display_name}</span>
              </div>
            </div>
          )}

          {/* Resolution info */}
          {report.status === 'resolved' && report.resolution_notes && (
            <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded text-sm mb-3">
              <span className="font-medium">Resolution: </span>
              {report.resolution_notes}
              {report.resolver && (
                <span className="text-muted-foreground">
                  {' '}— by {report.resolver.display_name}
                </span>
              )}
            </div>
          )}

          {report.status === 'dismissed' && (
            <div className="bg-gray-50 dark:bg-gray-900/10 p-2 rounded text-sm mb-3">
              <span className="font-medium">Dismissed</span>
              {report.resolution_notes && (
                <span>: {report.resolution_notes}</span>
              )}
              {report.resolver && (
                <span className="text-muted-foreground">
                  {' '}— by {report.resolver.display_name}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {isActionable && (
            <div className="flex gap-2 mt-3">
              {report.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => onReview(report)}>
                  Start Review
                </Button>
              )}
              <Button size="sm" onClick={() => onResolve(report)}>
                Resolve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDismiss(report)}>
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
