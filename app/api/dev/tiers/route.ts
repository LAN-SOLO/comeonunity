import { NextResponse } from 'next/server';
import { createDeveloperManager } from '@/lib/dev';

export async function GET() {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tiers = manager.getAllTiers();

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('Get tiers error:', error);
    return NextResponse.json({ error: 'Failed to get tiers' }, { status: 500 });
  }
}
