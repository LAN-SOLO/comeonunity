import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAddonManager } from '@/lib/billing/addon-manager';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ communityId: string; addonId: string }>;
}

const updateSchema = z.object({
  quantity: z.number().int().min(0),
});

// PATCH - Update add-on quantity
export async function PATCH(req: Request, { params }: RouteParams) {
  const { communityId, addonId } = await params;
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

  const validation = updateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
  }

  const { quantity } = validation.data;

  try {
    const manager = await createAddonManager();
    await manager.updateAddonQuantity(communityId, addonId, quantity);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update addon error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update add-on' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel an add-on
export async function DELETE(req: Request, { params }: RouteParams) {
  const { communityId, addonId } = await params;
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
    await manager.cancelAddon(communityId, addonId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel addon error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel add-on' },
      { status: 500 }
    );
  }
}
