'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FlaskConical, Play, Trash2, Check, Crown, Sparkles, Zap, Star } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/stripe/config';
import { formatPrice } from '@/lib/stripe/config';

interface Community {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface PlanTestingClientProps {
  communities: Community[];
  tiers: SubscriptionTier[];
}

const tierIcons: Record<string, typeof Crown> = {
  starter: Star,
  community: Zap,
  growth: Sparkles,
  professional: Crown,
};

export function PlanTestingClient({ communities, tiers }: PlanTestingClientProps) {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [loading, setLoading] = useState(false);
  const [activeSimulations, setActiveSimulations] = useState<Record<string, string>>({});

  const handleSimulate = async () => {
    if (!selectedCommunity || !selectedTier) {
      toast.error('Please select a community and tier');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/dev/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: selectedCommunity,
          tierId: selectedTier,
          status: selectedStatus,
          expiresInHours: 24, // Simulation expires in 24 hours
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to simulate');
      }

      setActiveSimulations((prev) => ({
        ...prev,
        [selectedCommunity]: selectedTier,
      }));

      toast.success(`Simulating ${selectedTier} plan for testing`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to simulate');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (communityId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dev/simulate?communityId=${communityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear simulation');
      }

      setActiveSimulations((prev) => {
        const next = { ...prev };
        delete next[communityId];
        return next;
      });

      toast.success('Simulation cleared');
    } catch (error) {
      toast.error('Failed to clear simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-orange-500" />
          Plan Testing
        </h1>
        <p className="text-muted-foreground mt-2">
          Simulate different subscription tiers to test features and limits
        </p>
      </div>

      {/* Simulation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Create Simulation</CardTitle>
          <CardDescription>
            Select a community and tier to simulate. Simulations expire after 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Community</label>
              <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select community" />
                </SelectTrigger>
                <SelectContent>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        (Current: {community.plan || 'free'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tier to Simulate</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => {
                    const Icon = tierIcons[tier.id] || Star;
                    return (
                      <SelectItem key={tier.id} value={tier.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {tier.displayName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSimulate}
            disabled={loading || !selectedCommunity || !selectedTier}
            className="mt-4"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Simulation
          </Button>
        </CardContent>
      </Card>

      {/* Active Simulations */}
      {Object.keys(activeSimulations).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Simulations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(activeSimulations).map(([communityId, tierId]) => {
                const community = communities.find((c) => c.id === communityId);
                const tier = tiers.find((t) => t.id === tierId);
                if (!community || !tier) return null;

                const Icon = tierIcons[tier.id] || Star;

                return (
                  <div
                    key={communityId}
                    className="flex items-center justify-between p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-orange-500 text-orange-500">
                        <Icon className="h-3 w-3 mr-1" />
                        {tier.displayName}
                      </Badge>
                      <span className="font-medium">{community.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClear(communityId)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Available Tiers</CardTitle>
          <CardDescription>
            Overview of all subscription tiers and their features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier) => {
              const Icon = tierIcons[tier.id] || Star;

              return (
                <Card key={tier.id} className={tier.popular ? 'border-primary' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-lg">{tier.displayName}</CardTitle>
                    </div>
                    <CardDescription>{formatPrice(tier.priceAnnual)}/year</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="space-y-1">
                      <p>{tier.limits.maxMembers} members</p>
                      <p>{tier.limits.maxItems} items</p>
                      <p>{tier.limits.maxResources} resources</p>
                      <p>{tier.limits.maxAdmins} admins</p>
                    </div>
                    <div className="pt-2 border-t space-y-1">
                      {Object.entries(tier.features).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          {value ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <span className="h-3 w-3" />
                          )}
                          <span className={!value ? 'text-muted-foreground' : ''}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
