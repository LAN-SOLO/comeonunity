'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { formatAuditAction, type AuditAction, type AuditSeverity } from '@/lib/security/audit-types'

export interface AuditLogEntry {
  id: string
  user_id: string | null
  user_email: string | null
  ip_address: string | null
  user_agent: string | null
  community_id: string | null
  action: AuditAction
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown> | null
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  severity: AuditSeverity
  created_at: string
}

interface AuditLogTableProps {
  logs: AuditLogEntry[]
  loading: boolean
}

function getSeverityBadge(severity: AuditSeverity) {
  const variants: Record<AuditSeverity, { className: string; label: string }> = {
    info: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30', label: 'Info' },
    warning: { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30', label: 'Warning' },
    error: { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30', label: 'Error' },
    critical: { className: 'bg-red-100 text-red-700 dark:bg-red-900/30', label: 'Critical' },
  }

  const variant = variants[severity]
  return <Badge className={variant.className}>{variant.label}</Badge>
}

function AuditLogRow({ log }: { log: AuditLogEntry }) {
  const [isOpen, setIsOpen] = useState(false)

  const hasDetails = log.details || log.previous_state || log.new_state

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="group">
        <TableCell>
          {hasDetails ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6" />
          )}
        </TableCell>
        <TableCell>
          <p className="text-sm">
            {format(new Date(log.created_at), 'MMM d, yyyy')}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(log.created_at), 'HH:mm:ss')}
          </p>
        </TableCell>
        <TableCell>
          <p className="font-medium">{formatAuditAction(log.action)}</p>
          <p className="text-xs text-muted-foreground">{log.action}</p>
        </TableCell>
        <TableCell>
          <p className="text-sm">{log.user_email || 'System'}</p>
          <p className="text-xs text-muted-foreground">{log.ip_address || '-'}</p>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{log.resource_type}</Badge>
        </TableCell>
        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
      </TableRow>
      {hasDetails && (
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={6}>
              <div className="py-4 px-6 space-y-4">
                {log.details && (
                  <div>
                    <p className="text-sm font-medium mb-2">Details</p>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}

                {(log.previous_state || log.new_state) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {log.previous_state && (
                      <div>
                        <p className="text-sm font-medium mb-2">Previous State</p>
                        <pre className="text-xs bg-red-50 dark:bg-red-900/10 p-3 rounded-md overflow-auto max-h-40">
                          {JSON.stringify(log.previous_state, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_state && (
                      <div>
                        <p className="text-sm font-medium mb-2">New State</p>
                        <pre className="text-xs bg-green-50 dark:bg-green-900/10 p-3 rounded-md overflow-auto max-h-40">
                          {JSON.stringify(log.new_state, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {log.resource_id && (
                    <span>Resource ID: {log.resource_id}</span>
                  )}
                  {log.user_id && (
                    <span>User ID: {log.user_id.slice(0, 8)}...</span>
                  )}
                  {log.user_agent && (
                    <span className="truncate max-w-md" title={log.user_agent}>
                      User Agent: {log.user_agent}
                    </span>
                  )}
                </div>
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

export function AuditLogTable({ logs, loading }: AuditLogTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead className="w-[140px]">Time</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead className="w-[100px]">Severity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              Loading...
            </TableCell>
          </TableRow>
        ) : logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No audit logs found
            </TableCell>
          </TableRow>
        ) : (
          logs.map((log) => <AuditLogRow key={log.id} log={log} />)
        )}
      </TableBody>
    </Table>
  )
}
