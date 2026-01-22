import { createClient } from '@/lib/supabase/server';
import { TRIAL_PERIOD_DAYS, COOLDOWN_PERIOD_DAYS } from '@/lib/stripe/config';

export interface TrialStatus {
  hasTrialed: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  trialEndsAt: Date | null;
  cooldownEndsAt: Date | null;
  inCooldown: boolean;
  convertedToPaid: boolean;
}

export class TrialManager {
  private supabase: Awaited<ReturnType<typeof createClient>>;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
  }

  async checkEligibility(userId: string): Promise<{
    eligible: boolean;
    reason?: string;
    cooldownEndsAt?: Date;
  }> {
    const { data: trial } = await this.supabase
      .from('user_trials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!trial) {
      return { eligible: true };
    }

    // Check if in cooldown
    if (trial.cooldown_ends_at && new Date(trial.cooldown_ends_at) > new Date()) {
      return {
        eligible: false,
        reason: 'cooldown',
        cooldownEndsAt: new Date(trial.cooldown_ends_at),
      };
    }

    // Already had a trial
    return {
      eligible: false,
      reason: 'already_trialed',
    };
  }

  async getTrialStatus(userId: string): Promise<TrialStatus | null> {
    const { data: trial } = await this.supabase
      .from('user_trials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!trial) {
      return null;
    }

    const now = new Date();
    const trialEnds = trial.trial_ends_at ? new Date(trial.trial_ends_at) : null;
    const cooldownEnds = trial.cooldown_ends_at ? new Date(trial.cooldown_ends_at) : null;

    const daysRemaining = trialEnds
      ? Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      hasTrialed: true,
      isActive: daysRemaining > 0 && !trial.converted_to_paid && !trial.canceled_at,
      isExpired: daysRemaining <= 0 && !trial.converted_to_paid,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndsAt: trialEnds,
      cooldownEndsAt: cooldownEnds,
      inCooldown: cooldownEnds ? cooldownEnds > now : false,
      convertedToPaid: trial.converted_to_paid || false,
    };
  }

  async startTrial(
    userId: string,
    tierId: string,
    communityId: string
  ): Promise<{ trialEndsAt: Date; cooldownEndsAt: Date }> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_PERIOD_DAYS);

    const cooldownEndsAt = new Date(trialEndsAt);
    cooldownEndsAt.setDate(cooldownEndsAt.getDate() + COOLDOWN_PERIOD_DAYS);

    // Record trial
    await this.supabase.from('user_trials').insert({
      user_id: userId,
      trial_tier_id: tierId,
      trial_ends_at: trialEndsAt.toISOString(),
      cooldown_ends_at: cooldownEndsAt.toISOString(),
    });

    // Create subscription record in trial status
    await this.supabase.from('community_subscriptions').insert({
      community_id: communityId,
      tier_id: tierId,
      status: 'trialing',
      is_trial: true,
      trial_ends_at: trialEndsAt.toISOString(),
    });

    // Initialize usage tracking
    await this.supabase.rpc('initialize_usage_tracking', {
      p_community_id: communityId,
      p_tier_id: tierId,
    });

    return { trialEndsAt, cooldownEndsAt };
  }

  async cancelTrial(userId: string, communityId: string): Promise<void> {
    const cooldownEndsAt = new Date();
    cooldownEndsAt.setDate(cooldownEndsAt.getDate() + COOLDOWN_PERIOD_DAYS);

    await this.supabase
      .from('user_trials')
      .update({
        canceled_at: new Date().toISOString(),
        cooldown_ends_at: cooldownEndsAt.toISOString(),
      })
      .eq('user_id', userId);

    await this.supabase
      .from('community_subscriptions')
      .update({ status: 'canceled' })
      .eq('community_id', communityId);
  }

  async markTrialReminderSent(
    userId: string,
    reminderDay: 7 | 12
  ): Promise<void> {
    const field = reminderDay === 7 ? 'reminder_sent_day_7' : 'reminder_sent_day_12';

    await this.supabase
      .from('user_trials')
      .update({ [field]: true })
      .eq('user_id', userId);
  }

  async getTrialsEndingSoon(days: number = 3): Promise<Array<{
    user_id: string;
    trial_ends_at: string;
    trial_tier_id: string;
  }>> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data } = await this.supabase
      .from('user_trials')
      .select('user_id, trial_ends_at, trial_tier_id')
      .lte('trial_ends_at', futureDate.toISOString())
      .gt('trial_ends_at', new Date().toISOString())
      .is('converted_to_paid', false)
      .is('canceled_at', null);

    return data || [];
  }
}

export async function createTrialManager() {
  const supabase = await createClient();
  return new TrialManager(supabase);
}
