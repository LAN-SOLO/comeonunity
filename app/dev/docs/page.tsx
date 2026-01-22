import { createDeveloperManager } from '@/lib/dev';
import { redirect } from 'next/navigation';
import { SecureDocsClient } from './secure-docs-client';

export default async function DevDocsPage() {
  const manager = await createDeveloperManager();

  if (!manager) {
    redirect('/');
  }

  await manager.logAction('view_secure_docs');

  const docs = await manager.listDocs();

  return <SecureDocsClient initialDocs={docs} />;
}
