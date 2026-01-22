import { redirect } from 'next/navigation';
import { createDeveloperManager } from '@/lib/dev';
import { createClient } from '@/lib/supabase/server';
import { PlanTestingClient } from './plan-testing-client';

export default async function DevPlansPage() {
  const manager = await createDeveloperManager();

  if (!manager) {
    redirect('/');
  }

  const profile = await manager.getProfile();

  if (!profile?.can_test_plans) {
    redirect('/dev');
  }

  await manager.logAction('view_plan_testing');

  // Get all communities the developer has access to
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let communities: Array<{ id: string; name: string; slug: string; plan: string }> = [];

  if (profile.can_access_all_communities) {
    // Master developers can see all communities
    const { data } = await supabase
      .from('communities')
      .select('id, name, slug, plan')
      .eq('status', 'active')
      .order('name');
    communities = data || [];
  } else {
    // Regular developers only see their communities
    const { data } = await supabase
      .from('community_members')
      .select('community:communities(id, name, slug, plan)')
      .eq('user_id', user?.id)
      .eq('status', 'active');
    communities = data?.map((m) => m.community).filter(Boolean) as typeof communities || [];
  }

  const tiers = manager.getAllTiers();

  return (
    <PlanTestingClient
      communities={communities}
      tiers={tiers}
    />
  );
}
