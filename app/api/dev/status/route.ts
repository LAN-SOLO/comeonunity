import { NextResponse } from 'next/server';
import { createDeveloperManager } from '@/lib/dev';

export async function GET() {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ isDeveloper: false }, { status: 200 });
    }

    const profile = await manager.getProfile();
    const accessLevel = await manager.getAccessLevel();

    return NextResponse.json({
      isDeveloper: true,
      accessLevel,
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        access_level: profile.access_level,
        can_test_plans: profile.can_test_plans,
        can_simulate_subscriptions: profile.can_simulate_subscriptions,
        can_access_all_communities: profile.can_access_all_communities,
        last_dev_access: profile.last_dev_access,
      } : null,
    });
  } catch (error) {
    console.error('Developer status error:', error);
    return NextResponse.json({ isDeveloper: false }, { status: 200 });
  }
}
