import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAddonManager } from '@/lib/billing/addon-manager';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

const purchaseSchema = z.object({
  addonId: z.string(),
  quantity: z.number().int().min(1).default(1),
});

// GET - List all add-ons for a community
export async function GET(req: Request, { params }: RouteParams) {
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
    const manager = await createAddonManager();
    const addons = await manager.getAvailableAddons(communityId);
    const activeAddons = await manager.getActiveAddons(communityId);

    return NextResponse.json({
      available: addons,
      active: activeAddons,
    });
  } catch (error) {
    console.error('Get addons error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get add-ons' },
      { status: 500 }
    );
  }
}

// POST - Purchase an add-on
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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = purchaseSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
  }

  const { addonId, quantity } = validation.data;

  try {
    const manager = await createAddonManager();
    const result = await manager.purchaseAddon(communityId, addonId, quantity);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Purchase addon error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to purchase add-on' },
      { status: 500 }
    );
  }
}
