import { NextResponse } from 'next/server';
import { createDeveloperManager } from '@/lib/dev';
import { z } from 'zod';

const simulateSchema = z.object({
  communityId: z.string().uuid(),
  tierId: z.string(),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled']).default('active'),
  expiresInHours: z.number().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = simulateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const { communityId, tierId, status, expiresInHours } = validation.data;

    const simulation = await manager.simulateSubscription(
      communityId,
      tierId,
      status,
      expiresInHours
    );

    return NextResponse.json({ success: true, simulation });
  } catch (error) {
    console.error('Simulate subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to simulate' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json({ error: 'communityId required' }, { status: 400 });
    }

    await manager.clearTestSubscription(communityId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear simulation error:', error);
    return NextResponse.json({ error: 'Failed to clear' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json({ error: 'communityId required' }, { status: 400 });
    }

    const simulation = await manager.getTestSubscription(communityId);

    return NextResponse.json({ simulation });
  } catch (error) {
    console.error('Get simulation error:', error);
    return NextResponse.json({ error: 'Failed to get simulation' }, { status: 500 });
  }
}
