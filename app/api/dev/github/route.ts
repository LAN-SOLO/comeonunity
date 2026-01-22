import { NextResponse } from 'next/server';
import { createDeveloperManager } from '@/lib/dev';

const GITHUB_OWNER = 'LAN-SOLO';
const GITHUB_REPO = 'comeonunity';

interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  workflow_id: number;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  triggering_actor: {
    login: string;
    avatar_url: string;
  };
  event: string;
  run_number: number;
  run_attempt: number;
}

interface GitHubWorkflow {
  id: number;
  name: string;
  state: string;
  path: string;
}

export async function GET(req: Request) {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'runs';

    const githubToken = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ComeOnUnity-Dev',
    };

    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    if (type === 'workflows') {
      // Get all workflows
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows`,
        { headers, next: { revalidate: 60 } }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('GitHub API error:', error);
        return NextResponse.json({
          error: 'Failed to fetch workflows',
          status: response.status,
          message: response.status === 404 ? 'Repository not found or no access' : error
        }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json({ workflows: data.workflows || [] });
    }

    // Get workflow runs
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=20`,
      { headers, next: { revalidate: 30 } }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API error:', error);
      return NextResponse.json({
        error: 'Failed to fetch workflow runs',
        status: response.status,
        message: response.status === 404 ? 'Repository not found or no access' : error
      }, { status: response.status });
    }

    const data = await response.json();
    const runs: GitHubWorkflowRun[] = data.workflow_runs || [];

    // Get latest commit
    const commitResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=5`,
      { headers, next: { revalidate: 30 } }
    );

    let commits: Array<{
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
      html_url: string;
    }> = [];

    if (commitResponse.ok) {
      commits = await commitResponse.json();
    }

    // Get repo info
    const repoResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
      { headers, next: { revalidate: 60 } }
    );

    let repo = null;
    if (repoResponse.ok) {
      repo = await repoResponse.json();
    }

    await manager.logAction('view_github_pipelines', { runs_count: runs.length });

    return NextResponse.json({
      runs,
      commits,
      repo,
      rateLimit: {
        remaining: response.headers.get('x-ratelimit-remaining'),
        limit: response.headers.get('x-ratelimit-limit'),
        reset: response.headers.get('x-ratelimit-reset'),
      },
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch GitHub data' },
      { status: 500 }
    );
  }
}
