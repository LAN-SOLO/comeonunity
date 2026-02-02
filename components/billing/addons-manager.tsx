'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AVAILABLE_ADDONS, formatPrice } from '@/lib/stripe/config';
import { Plus, Minus, Check, Users, Package, HardDrive, Shield, Zap, Palette, Headphones, Code } from 'lucide-react';

interface ActiveAddon {
  id: string;
  addon_id: string;
  quantity: number;
  is_active: boolean;
}

interface AddonsManagerProps {
  communityId: string;
  activeAddons: ActiveAddon[];
  hasSubscription: boolean;
  onAddonChange?: () => void;
}

const addonIcons: Record<string, React.ReactNode> = {
  extra_admin: <Shield className="h-5 w-5" />,
  extra_members_10: <Users className="h-5 w-5" />,
  extra_items_20: <Package className="h-5 w-5" />,
  extra_resources_5: <Package className="h-5 w-5" />,
  extra_storage_2gb: <HardDrive className="h-5 w-5" />,
  marketplace: <Zap className="h-5 w-5" />,
  custom_branding: <Palette className="h-5 w-5" />,
  priority_support: <Headphones className="h-5 w-5" />,
  api_access: <Code className="h-5 w-5" />,
};

export function AddonsManager({
  communityId,
  activeAddons,
  hasSubscription,
  onAddonChange,
}: AddonsManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<(typeof AVAILABLE_ADDONS)[0] | null>(null);
  const [quantity, setQuantity] = useState(1);

  const getActiveQuantity = (addonId: string): number => {
    const active = activeAddons.find((a) => a.addon_id === addonId && a.is_active);
    return active?.quantity || 0;
  };

  const isAddonActive = (addonId: string): boolean => {
    return activeAddons.some((a) => a.addon_id === addonId && a.is_active);
  };

  const handlePurchase = async () => {
    if (!selectedAddon) return;

    setLoading(selectedAddon.id);
    try {
      const response = await fetch(`/api/communities/${communityId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId: selectedAddon.id,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase add-on');
      }

      toast.success(`${selectedAddon.name} added to your subscription`);
      setShowPurchaseDialog(false);
      setSelectedAddon(null);
      setQuantity(1);
      onAddonChange?.();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to purchase add-on');
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateQuantity = async (addonId: string, newQuantity: number) => {
    setLoading(addonId);
    try {
      const response = await fetch(`/api/communities/${communityId}/addons/${addonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update add-on');
      }

      toast.success('Add-on updated');
      onAddonChange?.();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update add-on');
    } finally {
      setLoading(null);
    }
  };

  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCancel = async (addonId: string, addonName: string) => {
    setCancelTarget({ id: addonId, name: addonName });
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const { id: addonId, name: addonName } = cancelTarget;
    setCancelTarget(null);

    setLoading(addonId);
    try {
      const response = await fetch(`/api/communities/${communityId}/addons/${addonId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel add-on');
      }

      toast.success(`${addonName} removed from your subscription`);
      onAddonChange?.();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel add-on');
    } finally {
      setLoading(null);
    }
  };

  const cancelDialog = cancelTarget ? (
    <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Add-on</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {cancelTarget.name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCancelTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={confirmCancel}>Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  const openPurchaseDialog = (addon: (typeof AVAILABLE_ADDONS)[0]) => {
    setSelectedAddon(addon);
    setQuantity(1);
    setShowPurchaseDialog(true);
  };

  // Group addons by category
  const capacityAddons = AVAILABLE_ADDONS.filter((a) => a.metricIncrease);
  const featureAddons = AVAILABLE_ADDONS.filter((a) => !a.metricIncrease);

  if (!hasSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add-ons</CardTitle>
          <CardDescription>
            Upgrade to a paid plan to purchase add-ons
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {cancelDialog}
      <div className="space-y-6">
        {/* Capacity Add-ons */}
        <Card>
          <CardHeader>
            <CardTitle>Capacity Add-ons</CardTitle>
            <CardDescription>
              Increase your limits without upgrading your plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {capacityAddons.map((addon) => {
                const isActive = isAddonActive(addon.id);
                const activeQty = getActiveQuantity(addon.id);
                const isLoading = loading === addon.id;

                return (
                  <div
                    key={addon.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {addonIcons[addon.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{addon.name}</h4>
                        {isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Active ({activeQty}x)
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {addon.description}
                      </p>
                      <p className="text-sm font-medium mt-2">
                        {formatPrice(addon.pricePerYear)}/year
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        {isActive ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(addon.id, activeQty - 1)}
                              disabled={isLoading || activeQty <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{activeQty}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(addon.id, activeQty + 1)}
                              disabled={isLoading}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(addon.id, addon.name)}
                              disabled={isLoading}
                              className="ml-auto text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPurchaseDialog(addon)}
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Feature Add-ons */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Add-ons</CardTitle>
            <CardDescription>
              Unlock additional features for your community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {featureAddons.map((addon) => {
                const isActive = isAddonActive(addon.id);
                const isLoading = loading === addon.id;

                return (
                  <div
                    key={addon.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {addonIcons[addon.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{addon.name}</h4>
                        {isActive && (
                          <Badge className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {addon.description}
                      </p>
                      <p className="text-sm font-medium mt-2">
                        {formatPrice(addon.pricePerYear)}/year
                      </p>
                      <div className="mt-3">
                        {isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(addon.id, addon.name)}
                            disabled={isLoading}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPurchaseDialog(addon)}
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {selectedAddon?.name}</DialogTitle>
            <DialogDescription>
              {selectedAddon?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedAddon?.metricIncrease && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                This will add{' '}
                <span className="font-medium">
                  {selectedAddon.metricIncrease.amount * quantity}{' '}
                  {selectedAddon.metricIncrease.metric.replace('_', ' ')}
                </span>{' '}
                to your limits.
              </div>
            </div>
          )}
          <div className="border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Price per year:</span>
              <span className="font-medium">
                {selectedAddon ? formatPrice(selectedAddon.pricePerYear * quantity) : ''}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={loading !== null}>
              {loading ? 'Adding...' : 'Add to Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
