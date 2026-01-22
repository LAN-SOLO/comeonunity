import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSubscriptionManager } from '@/lib/billing';

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { communityId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is admin
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const manager = await createSubscriptionManager();
    await manager.cancelSubscription(communityId, false); // Cancel at period end

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
