import { createDeveloperManager } from '@/lib/dev';
import { redirect } from 'next/navigation';
import { GitHubPipelineClient } from './github-pipeline-client';

export default async function DevGitHubPage() {
  const manager = await createDeveloperManager();

  if (!manager) {
    redirect('/');
  }

  await manager.logAction('view_github_page');

  return <GitHubPipelineClient />;
}
