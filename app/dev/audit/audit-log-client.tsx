'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  History,
  Activity,
  Clock,
  FileText,
  FlaskConical,
  Eye,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditLogClientProps {
  logs: AuditLog[];
}

const actionIcons: Record<string, typeof Activity> = {
  dev_area_access: Settings,
  view_dashboard: Eye,
  view_plan_testing: FlaskConical,
  view_secure_docs: FileText,
  view_audit_log: History,
  simulate_subscription: FlaskConical,
  clear_test_subscription: Trash2,
  save_doc: FileText,
  view_doc: Eye,
  delete_doc: Trash2,
};

const actionLabels: Record<string, string> = {
  dev_area_access: 'Accessed Dev Area',
  view_dashboard: 'Viewed Dashboard',
  view_plan_testing: 'Viewed Plan Testing',
  view_secure_docs: 'Viewed Secure Docs',
  view_audit_log: 'Viewed Audit Log',
  simulate_subscription: 'Started Simulation',
  clear_test_subscription: 'Cleared Simulation',
  save_doc: 'Created Document',
  view_doc: 'Viewed Document',
  delete_doc: 'Deleted Document',
};

export function AuditLogClient({ logs }: AuditLogClientProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Group logs by date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('de-DE');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJson = (obj: Record<string, unknown>) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <History className="h-8 w-8 text-orange-500" />
          Audit Log
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete history of all developer actions and access. Click on any entry to view full details.
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-sm text-muted-foreground">Total Actions</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">
                {logs.filter((l) => l.action.includes('simulate')).length}
              </p>
              <p className="text-sm text-muted-foreground">Simulations</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">
                {logs.filter((l) => l.action.includes('doc')).length}
              </p>
              <p className="text-sm text-muted-foreground">Doc Actions</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{Object.keys(groupedLogs).length}</p>
              <p className="text-sm text-muted-foreground">Active Days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Timeline */}
      {Object.entries(groupedLogs).map(([date, dateLogs]) => {
        const isExpanded = expandedDates.has(date);

        return (
          <Card key={date}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleDate(date)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Clock className="h-4 w-4" />
                    {date}
                  </CardTitle>
                  <CardDescription>{dateLogs.length} actions - Click to {isExpanded ? 'collapse' : 'expand'}</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3">
                    {dateLogs.map((log) => {
                      const Icon = actionIcons[log.action] || Activity;
                      const label = actionLabels[log.action] || log.action;

                      return (
                        <div
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group"
                        >
                          <div className="p-2 bg-background rounded-full">
                            <Icon className="h-4 w-4 text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{label}</span>
                              <Badge variant="outline" className="text-xs font-mono">
                                {log.action}
                              </Badge>
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground font-mono truncate">
                                {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                                  <span key={key} className="mr-3">
                                    {key}: {String(value).slice(0, 20)}
                                    {String(value).length > 20 ? '...' : ''}
                                  </span>
                                ))}
                                {Object.keys(log.details).length > 3 && (
                                  <span className="text-orange-500">+{Object.keys(log.details).length - 3} more</span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleTimeString('de-DE')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {logs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs yet</p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && (
                <>
                  {(() => {
                    const Icon = actionIcons[selectedLog.action] || Activity;
                    return <Icon className="h-5 w-5 text-orange-500" />;
                  })()}
                  {actionLabels[selectedLog.action] || selectedLog.action}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && new Date(selectedLog.created_at).toLocaleString('de-DE')}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="flex-1 overflow-auto space-y-4">
              {/* Action Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Action</p>
                  <Badge variant="outline" className="font-mono">
                    {selectedLog.action}
                  </Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Log ID</p>
                  <code className="text-xs">{selectedLog.id}</code>
                </div>
              </div>

              {/* Details */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Details</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formatJson(selectedLog.details))}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs font-mono max-h-60">
                    {formatJson(selectedLog.details)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {(selectedLog.ip_address || selectedLog.user_agent) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Metadata</p>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-xs">
                    {selectedLog.ip_address && (
                      <p>
                        <span className="text-muted-foreground">IP Address:</span>{' '}
                        <code>{selectedLog.ip_address}</code>
                      </p>
                    )}
                    {selectedLog.user_agent && (
                      <p>
                        <span className="text-muted-foreground">User Agent:</span>{' '}
                        <code className="break-all">{selectedLog.user_agent}</code>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Raw Data */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Raw Log Entry</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formatJson(selectedLog as unknown as Record<string, unknown>))}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs font-mono max-h-40">
                  {formatJson(selectedLog as unknown as Record<string, unknown>)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
