'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCommunitySchema, type CreateCommunityInput } from '@/lib/validations/community'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2, Building2, Home, MapPin, Users, Sparkles } from 'lucide-react'

const communityTypes = [
  { value: 'weg', label: 'WEG (Homeowners Association)', icon: Building2 },
  { value: 'house', label: 'House Community', icon: Home },
  { value: 'neighborhood', label: 'Neighborhood', icon: MapPin },
  { value: 'cohousing', label: 'Co-Housing', icon: Users },
  { value: 'interest', label: 'Interest Group', icon: Sparkles },
]

export default function NewCommunityPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCommunityInput>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: '',
      type: 'house',
      description: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'DE',
      locale: 'de',
      timezone: 'Europe/Berlin',
    },
  })

  const selectedType = watch('type')

  const onSubmit = async (data: CreateCommunityInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You must be logged in to create a community')
      }

      // Generate slug from name
      const baseSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Check if slug exists and append number if needed
      let slug = baseSlug
      let counter = 0
      while (true) {
        const { data: existing } = await supabase
          .from('communities')
          .select('id')
          .eq('slug', slug)
          .single()

        if (!existing) break
        counter++
        slug = `${baseSlug}-${counter}`
      }

      // Create community
      const { data: community, error: createError } = await supabase
        .from('communities')
        .insert({
          name: data.name,
          slug,
          type: data.type,
          description: data.description || null,
          address: data.address || null,
          city: data.city || null,
          postal_code: data.postalCode || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: 'admin',
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
          status: 'active',
        })

      if (memberError) {
        // Rollback community creation
        await supabase.from('communities').delete().eq('id', community.id)
        throw memberError
      }

      router.push(`/c/${community.id}`)
    } catch (err) {
      console.error('Failed to create community:', err)
      setError(err instanceof Error ? err.message : 'Failed to create community. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create a Community</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new community for your neighbors, building, or group
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Community Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Musterstraße 123"
              disabled={isLoading}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Community Type *</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setValue('type', value as CreateCommunityInput['type'])}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {communityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A brief description of your community..."
              rows={3}
              disabled={isLoading}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <p className="text-sm font-medium">Location (optional)</p>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="e.g., Musterstraße 123"
                disabled={isLoading}
                {...register('address')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="e.g., 10115"
                  disabled={isLoading}
                  {...register('postalCode')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="e.g., Berlin"
                  disabled={isLoading}
                  {...register('city')}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Community'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
