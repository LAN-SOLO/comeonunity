import { NextResponse } from 'next/server';
import { createDeveloperManager } from '@/lib/dev';

export async function GET(req: Request) {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await manager.getAuditLog(Math.min(limit, 100));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ error: 'Failed to get audit logs' }, { status: 500 });
  }
}
