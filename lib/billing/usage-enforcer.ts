import { createClient } from '@/lib/supabase/server';

export type UsageMetric = 'members' | 'items' | 'resources' | 'storage_mb' | 'admins';

export interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  percentage: number;
  message?: string;
}

export interface UsageStats {
  members: UsageCheckResult;
  items: UsageCheckResult;
  resources: UsageCheckResult;
  storage_mb: UsageCheckResult;
  admins: UsageCheckResult;
}

export class UsageEnforcer {
  private supabase: Awaited<ReturnType<typeof createClient>>;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
  }

  async checkUsage(communityId: string, metric: UsageMetric): Promise<UsageCheckResult> {
    const { data } = await this.supabase
      .from('usage_tracking')
      .select('current_value, limit_value')
      .eq('community_id', communityId)
      .eq('metric', metric)
      .single();

    if (!data) {
      // No tracking data - allow by default but with warning
      return {
        allowed: true,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        percentage: 0,
        message: 'Usage tracking not initialized',
      };
    }

    const remaining = data.limit_value - data.current_value;
    const allowed = remaining > 0;
    const percentage = data.limit_value > 0
      ? Math.round((data.current_value / data.limit_value) * 100)
      : 0;

    return {
      allowed,
      currentUsage: data.current_value,
      limit: data.limit_value,
      remaining: Math.max(0, remaining),
      percentage,
      message: allowed ? undefined : `${metric} limit reached. Please upgrade your plan.`,
    };
  }

  async getAllUsage(communityId: string): Promise<UsageStats> {
    const metrics: UsageMetric[] = ['members', 'items', 'resources', 'storage_mb', 'admins'];
    const results: Partial<UsageStats> = {};

    for (const metric of metrics) {
      results[metric] = await this.checkUsage(communityId, metric);
    }

    return results as UsageStats;
  }

  async canAdd(communityId: string, metric: UsageMetric, amount = 1): Promise<boolean> {
    const usage = await this.checkUsage(communityId, metric);
    return usage.remaining >= amount;
  }

  async incrementUsage(communityId: string, metric: UsageMetric, amount = 1): Promise<void> {
    await this.supabase.rpc('increment_usage', {
      p_community_id: communityId,
      p_metric: metric,
      p_amount: amount,
    });
  }

  async decrementUsage(communityId: string, metric: UsageMetric, amount = 1): Promise<void> {
    await this.supabase.rpc('decrement_usage', {
      p_community_id: communityId,
      p_metric: metric,
      p_amount: amount,
    });
  }

  async getUsageWarnings(communityId: string): Promise<Array<{
    metric: UsageMetric;
    level: 'warning' | 'critical';
    message: string;
    percentage: number;
  }>> {
    const allUsage = await this.getAllUsage(communityId);
    const warnings: Array<{
      metric: UsageMetric;
      level: 'warning' | 'critical';
      message: string;
      percentage: number;
    }> = [];

    const metricLabels: Record<UsageMetric, string> = {
      members: 'Members',
      items: 'Items',
      resources: 'Resources',
      storage_mb: 'Storage',
      admins: 'Admins',
    };

    for (const [metric, usage] of Object.entries(allUsage) as Array<[UsageMetric, UsageCheckResult]>) {
      if (usage.percentage >= 100) {
        warnings.push({
          metric,
          level: 'critical',
          message: `${metricLabels[metric]} limit reached (${usage.currentUsage}/${usage.limit})`,
          percentage: usage.percentage,
        });
      } else if (usage.percentage >= 80) {
        warnings.push({
          metric,
          level: 'warning',
          message: `${metricLabels[metric]} approaching limit (${usage.currentUsage}/${usage.limit})`,
          percentage: usage.percentage,
        });
      }
    }

    return warnings;
  }
}

export async function createUsageEnforcer() {
  const supabase = await createClient();
  return new UsageEnforcer(supabase);
}

// Utility function to check a single metric quickly
export async function checkCommunityUsage(
  communityId: string,
  metric: UsageMetric
): Promise<UsageCheckResult> {
  const enforcer = await createUsageEnforcer();
  return enforcer.checkUsage(communityId, metric);
}

// Utility to check if action is allowed
export async function canPerformAction(
  communityId: string,
  metric: UsageMetric,
  amount = 1
): Promise<boolean> {
  const enforcer = await createUsageEnforcer();
  return enforcer.canAdd(communityId, metric, amount);
}
