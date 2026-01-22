'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  GitBranch,
  GitCommit,
  Github,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  AlertCircle,
  PlayCircle,
  Timer,
  Activity,
} from 'lucide-react';

interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  event: string;
  run_number: number;
  run_attempt: number;
}

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

interface Repo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  default_branch: string;
  open_issues_count: number;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
}

interface GitHubData {
  runs: WorkflowRun[];
  commits: Commit[];
  repo: Repo | null;
  rateLimit: {
    remaining: string | null;
    limit: string | null;
    reset: string | null;
  };
  error?: string;
  message?: string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  success: { icon: CheckCircle2, color: 'text-green-500', label: 'Success' },
  failure: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-gray-500', label: 'Cancelled' },
  skipped: { icon: Clock, color: 'text-gray-400', label: 'Skipped' },
  in_progress: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
  queued: { icon: Clock, color: 'text-yellow-500', label: 'Queued' },
  waiting: { icon: Timer, color: 'text-yellow-500', label: 'Waiting' },
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
};

export function GitHubPipelineClient() {
  const [data, setData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/dev/github');
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || result.error || 'Failed to fetch');
        return;
      }

      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, autoRefresh]);

  const getStatusConfig = (run: WorkflowRun) => {
    if (run.status === 'completed') {
      return statusConfig[run.conclusion || 'success'] || statusConfig.success;
    }
    return statusConfig[run.status] || statusConfig.pending;
  };

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Github className="h-8 w-8 text-orange-500" />
            GitHub Pipelines
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time CI/CD pipeline status and commit history
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {formatTimeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'border-green-500 text-green-500' : ''}
          >
            <Activity className="h-4 w-4 mr-1" />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Error fetching GitHub data</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Set GITHUB_TOKEN in .env.local for higher rate limits
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repo Info */}
      {data?.repo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  {data.repo.full_name}
                </CardTitle>
                <CardDescription>{data.repo.description}</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={data.repo.html_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span>{data.repo.default_branch}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Issues:</span>
                <Badge variant="secondary">{data.repo.open_issues_count}</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Last push:</span>
                <span>{formatTimeAgo(data.repo.pushed_at)}</span>
              </div>
              {data.rateLimit.remaining && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>API Rate:</span>
                  <span>{data.rateLimit.remaining}/{data.rateLimit.limit}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Runs */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Workflow Runs
          </h2>

          {data?.runs && data.runs.length > 0 ? (
            <div className="space-y-3">
              {data.runs.map((run) => {
                const status = getStatusConfig(run);
                const StatusIcon = status.icon;
                const isRunning = run.status === 'in_progress' || run.status === 'queued';

                return (
                  <Card
                    key={run.id}
                    className={`overflow-hidden ${isRunning ? 'border-blue-500/50' : ''}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full bg-muted ${isRunning ? 'animate-pulse' : ''}`}>
                          <StatusIcon className={`h-5 w-5 ${status.color} ${isRunning ? 'animate-spin' : ''}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{run.name}</span>
                            <Badge variant="outline" className="text-xs">
                              #{run.run_number}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {run.event}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {run.head_branch}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitCommit className="h-3 w-3" />
                              {run.head_sha.slice(0, 7)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={run.actor.avatar_url} />
                              <AvatarFallback>{run.actor.login[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {run.actor.login}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(run.created_at)}
                            </span>
                            {run.status === 'completed' && (
                              <span className="text-xs text-muted-foreground">
                                Duration: {formatDuration(run.run_started_at, run.updated_at)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={`${status.color} bg-transparent border`}>
                            {status.label}
                          </Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={run.html_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No workflow runs found</p>
                <p className="text-sm">Push some commits or set up GitHub Actions</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Commits */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Recent Commits
          </h2>

          {data?.commits && data.commits.length > 0 ? (
            <Card>
              <CardContent className="py-4">
                <div className="space-y-4">
                  {data.commits.map((commit) => (
                    <div key={commit.sha} className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-muted mt-0.5">
                        <GitCommit className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {commit.commit.message.split('\n')[0]}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <code className="px-1 py-0.5 bg-muted rounded">
                            {commit.sha.slice(0, 7)}
                          </code>
                          <span>{commit.commit.author.name}</span>
                          <span>{formatTimeAgo(commit.commit.author.date)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0" asChild>
                        <a href={commit.html_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No commits found</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pipeline Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Success
                  </span>
                  <Badge variant="secondary">
                    {data?.runs?.filter((r) => r.conclusion === 'success').length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Failed
                  </span>
                  <Badge variant="secondary">
                    {data?.runs?.filter((r) => r.conclusion === 'failure').length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-500" />
                    Running
                  </span>
                  <Badge variant="secondary">
                    {data?.runs?.filter((r) => r.status === 'in_progress').length || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
