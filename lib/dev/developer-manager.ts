/**
 * Developer Access Manager
 * Handles developer authentication, permissions, and testing capabilities
 */

import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from './crypto';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe/config';

export type DeveloperAccessLevel = 'none' | 'developer' | 'master' | 'admin';

export interface DeveloperUser {
  id: string;
  user_id: string;
  email: string;
  developer_key: string;
  access_level: DeveloperAccessLevel;
  is_active: boolean;
  can_test_plans: boolean;
  can_simulate_subscriptions: boolean;
  can_access_all_communities: boolean;
  last_dev_access: string | null;
  created_at: string;
}

export interface DeveloperTestSubscription {
  id: string;
  developer_id: string;
  community_id: string;
  simulated_tier_id: string;
  simulated_status: string;
  simulated_features: Record<string, unknown>;
  expires_at: string | null;
}

export interface DeveloperDoc {
  id: string;
  title: string;
  content: string; // Decrypted content
  category: string;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export class DeveloperManager {
  private supabase: Awaited<ReturnType<typeof createClient>>;
  private userId: string;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Check if the current user is a developer
   */
  async isDeveloper(): Promise<boolean> {
    const { data } = await this.supabase.rpc('is_developer', {
      p_user_id: this.userId,
    });
    return data === true;
  }

  /**
   * Get the developer's access level
   */
  async getAccessLevel(): Promise<DeveloperAccessLevel> {
    const { data } = await this.supabase.rpc('get_developer_level', {
      p_user_id: this.userId,
    });
    return (data as DeveloperAccessLevel) || 'none';
  }

  /**
   * Get developer profile
   */
  async getProfile(): Promise<DeveloperUser | null> {
    const { data, error } = await this.supabase
      .from('developer_users')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return data as DeveloperUser;
  }

  /**
   * Log a developer action
   */
  async logAction(
    action: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.supabase.rpc('log_developer_action', {
      p_action: action,
      p_details: details || null,
      p_ip_address: ipAddress || null,
      p_user_agent: userAgent || null,
    });
  }

  /**
   * Get audit log
   */
  async getAuditLog(limit = 50): Promise<Array<{
    id: string;
    action: string;
    details: Record<string, unknown>;
    created_at: string;
  }>> {
    const profile = await this.getProfile();
    if (!profile) return [];

    const { data } = await this.supabase
      .from('developer_audit_log')
      .select('*')
      .eq('developer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Get all available tiers for testing
   */
  getAllTiers(): SubscriptionTier[] {
    return SUBSCRIPTION_TIERS;
  }

  /**
   * Simulate a subscription for testing
   */
  async simulateSubscription(
    communityId: string,
    tierId: string,
    status = 'active',
    expiresInHours?: number
  ): Promise<DeveloperTestSubscription | null> {
    const profile = await this.getProfile();
    if (!profile || !profile.can_simulate_subscriptions) {
      throw new Error('Not authorized to simulate subscriptions');
    }

    const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId);
    if (!tier) {
      throw new Error('Invalid tier ID');
    }

    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await this.supabase
      .from('developer_test_subscriptions')
      .upsert({
        developer_id: profile.id,
        community_id: communityId,
        simulated_tier_id: tierId,
        simulated_status: status,
        simulated_features: tier.features,
        expires_at: expiresAt,
      }, {
        onConflict: 'developer_id,community_id',
      })
      .select()
      .single();

    if (error) throw error;

    await this.logAction('simulate_subscription', {
      community_id: communityId,
      tier_id: tierId,
      status,
      expires_at: expiresAt,
    });

    return data as DeveloperTestSubscription;
  }

  /**
   * Get active test subscription for a community
   */
  async getTestSubscription(communityId: string): Promise<DeveloperTestSubscription | null> {
    const profile = await this.getProfile();
    if (!profile) return null;

    const { data } = await this.supabase
      .from('developer_test_subscriptions')
      .select('*')
      .eq('developer_id', profile.id)
      .eq('community_id', communityId)
      .single();

    if (!data) return null;

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await this.supabase
        .from('developer_test_subscriptions')
        .delete()
        .eq('id', data.id);
      return null;
    }

    return data as DeveloperTestSubscription;
  }

  /**
   * Clear test subscription
   */
  async clearTestSubscription(communityId: string): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) return;

    await this.supabase
      .from('developer_test_subscriptions')
      .delete()
      .eq('developer_id', profile.id)
      .eq('community_id', communityId);

    await this.logAction('clear_test_subscription', { community_id: communityId });
  }

  /**
   * Save encrypted documentation
   */
  async saveDoc(
    title: string,
    content: string,
    category = 'general',
    isSensitive = true
  ): Promise<string> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('Not a developer');

    const { encrypted, iv } = encrypt(content);

    const { data, error } = await this.supabase
      .from('developer_docs')
      .insert({
        developer_id: profile.id,
        title,
        content_encrypted: encrypted,
        encryption_iv: iv,
        category,
        is_sensitive: isSensitive,
      })
      .select('id')
      .single();

    if (error) throw error;

    await this.logAction('save_doc', { doc_id: data.id, title, category });

    return data.id;
  }

  /**
   * Get decrypted documentation
   */
  async getDoc(docId: string): Promise<DeveloperDoc | null> {
    const profile = await this.getProfile();
    if (!profile) return null;

    const { data, error } = await this.supabase
      .from('developer_docs')
      .select('*')
      .eq('id', docId)
      .eq('developer_id', profile.id)
      .single();

    if (error || !data) return null;

    // Update view count
    await this.supabase
      .from('developer_docs')
      .update({
        view_count: (data.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', docId);

    await this.logAction('view_doc', { doc_id: docId, title: data.title });

    // Decrypt content
    const content = decrypt(data.content_encrypted, data.encryption_iv);

    return {
      id: data.id,
      title: data.title,
      content,
      category: data.category,
      is_sensitive: data.is_sensitive,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * List all docs (without content)
   */
  async listDocs(): Promise<Array<Omit<DeveloperDoc, 'content'>>> {
    const profile = await this.getProfile();
    if (!profile) return [];

    const { data } = await this.supabase
      .from('developer_docs')
      .select('id, title, category, is_sensitive, created_at, updated_at')
      .eq('developer_id', profile.id)
      .order('updated_at', { ascending: false });

    return (data || []).map((d) => ({ ...d, content: '' }));
  }

  /**
   * Delete a doc
   */
  async deleteDoc(docId: string): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) return;

    await this.supabase
      .from('developer_docs')
      .delete()
      .eq('id', docId)
      .eq('developer_id', profile.id);

    await this.logAction('delete_doc', { doc_id: docId });
  }
}

/**
 * Create a developer manager instance
 */
export async function createDeveloperManager(): Promise<DeveloperManager | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const manager = new DeveloperManager(supabase, user.id);
  const isDev = await manager.isDeveloper();

  if (!isDev) return null;

  return manager;
}
