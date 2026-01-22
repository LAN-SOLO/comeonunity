import { NextResponse } from 'next/server';
import { createDeveloperManager } from '@/lib/dev';

interface RouteParams {
  params: Promise<{ docId: string }>;
}

// Get a single doc (decrypted)
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { docId } = await params;
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await manager.getDoc(docId);

    if (!doc) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }

    return NextResponse.json({ doc });
  } catch (error) {
    console.error('Get doc error:', error);
    return NextResponse.json({ error: 'Failed to get doc' }, { status: 500 });
  }
}

// Delete a doc
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { docId } = await params;
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await manager.deleteDoc(docId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete doc error:', error);
    return NextResponse.json({ error: 'Failed to delete doc' }, { status: 500 });
  }
}
