'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  Package,
  Calendar,
  Newspaper,
  Search,
  Loader2,
  MapPin,
} from 'lucide-react'
import { format } from 'date-fns'

interface SearchResult {
  type: 'member' | 'item' | 'event' | 'news'
  id: string
  title: string
  subtitle?: string
  image?: string | null
  href: string
}

interface SearchCommandProps {
  communityId: string
}

export function SearchCommand({ communityId }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Open with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Search function
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const searchTerm = `%${searchQuery.toLowerCase()}%`

      // Search members
      const { data: members } = await supabase
        .from('community_members')
        .select('id, display_name, avatar_url, role')
        .eq('community_id', communityId)
        .eq('status', 'active')
        .ilike('display_name', searchTerm)
        .limit(5)

      // Search items
      const { data: items } = await supabase
        .from('items')
        .select('id, name, category, status')
        .eq('community_id', communityId)
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(5)

      // Search events
      const { data: events } = await supabase
        .from('events')
        .select('id, title, starts_at, location')
        .eq('community_id', communityId)
        .neq('status', 'draft')
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5)

      // Search news
      const { data: news } = await supabase
        .from('news')
        .select('id, title, category, published_at')
        .eq('community_id', communityId)
        .eq('status', 'published')
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .order('published_at', { ascending: false })
        .limit(5)

      // Combine results
      const allResults: SearchResult[] = [
        ...(members || []).map((m) => ({
          type: 'member' as const,
          id: m.id,
          title: m.display_name || 'Unknown',
          subtitle: m.role,
          image: m.avatar_url,
          href: `/c/${communityId}/members/${m.id}`,
        })),
        ...(items || []).map((i) => ({
          type: 'item' as const,
          id: i.id,
          title: i.name,
          subtitle: `${i.category} • ${i.status}`,
          href: `/c/${communityId}/items/${i.id}`,
        })),
        ...(events || []).map((e) => ({
          type: 'event' as const,
          id: e.id,
          title: e.title,
          subtitle: `${format(new Date(e.starts_at), 'MMM d')}${e.location ? ` • ${e.location}` : ''}`,
          href: `/c/${communityId}/calendar/${e.id}`,
        })),
        ...(news || []).map((n) => ({
          type: 'news' as const,
          id: n.id,
          title: n.title,
          subtitle: n.category,
          href: `/c/${communityId}/news/${n.id}`,
        })),
      ]

      setResults(allResults)
    } catch {
      // Silently fail - tables may not exist yet
    } finally {
      setIsLoading(false)
    }
  }, [communityId, supabase])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, search])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.href)
  }

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'member':
        return User
      case 'item':
        return Package
      case 'event':
        return Calendar
      case 'news':
        return Newspaper
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Group results by type
  const memberResults = results.filter((r) => r.type === 'member')
  const itemResults = results.filter((r) => r.type === 'item')
  const eventResults = results.filter((r) => r.type === 'event')
  const newsResults = results.filter((r) => r.type === 'news')

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search members, items, events, news..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : query.length < 2 ? (
          <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
        ) : results.length === 0 ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : (
          <>
            {memberResults.length > 0 && (
              <CommandGroup heading="Members">
                {memberResults.map((result) => (
                  <CommandItem
                    key={`member-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={result.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(result.title)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {itemResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Items">
                  {itemResults.map((result) => {
                    const Icon = getIcon(result.type)
                    return (
                      <CommandItem
                        key={`item-${result.id}`}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-2">
                          <Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}

            {eventResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Events">
                  {eventResults.map((result) => {
                    const Icon = getIcon(result.type)
                    return (
                      <CommandItem
                        key={`event-${result.id}`}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-2">
                          <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}

            {newsResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="News">
                  {newsResults.map((result) => {
                    const Icon = getIcon(result.type)
                    return (
                      <CommandItem
                        key={`news-${result.id}`}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-2">
                          <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground capitalize">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
