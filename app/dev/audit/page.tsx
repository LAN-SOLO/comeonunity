import { createDeveloperManager } from '@/lib/dev';
import { redirect } from 'next/navigation';
import { AuditLogClient } from './audit-log-client';

export default async function DevAuditPage() {
  const manager = await createDeveloperManager();

  if (!manager) {
    redirect('/');
  }

  await manager.logAction('view_audit_log');

  const logs = await manager.getAuditLog(100);

  return <AuditLogClient logs={logs} />;
}
