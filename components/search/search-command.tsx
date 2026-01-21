'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import {
  User,
  Package,
  Calendar,
  Newspaper,
  Loader2,
  Building2,
  Boxes,
} from 'lucide-react'

interface SearchResult {
  type: 'member' | 'item' | 'event' | 'news' | 'resource'
  id: string
  title: string
  subtitle?: string
  image?: string | null
  href: string
  communityName?: string
  communitySlug?: string
}

interface SearchCommandProps {
  communityId?: string // Optional - if not provided, searches across all user's communities
}

// Helper function moved outside component - no dependency on props/state
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
    case 'resource':
      return Boxes
  }
}

export function SearchCommand({ communityId }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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

  // Search function using API
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        types: 'news,item,event,member,resource',
        limit: '20',
      })

      if (communityId) {
        params.set('community_id', communityId)
      }

      const response = await fetch(`/api/search?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [communityId])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, search])

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.href)
  }, [router])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Group results by type - memoized to avoid recalculating on every render
  const { memberResults, itemResults, eventResults, newsResults, resourceResults } = useMemo(() => ({
    memberResults: results.filter((r) => r.type === 'member'),
    itemResults: results.filter((r) => r.type === 'item'),
    eventResults: results.filter((r) => r.type === 'event'),
    newsResults: results.filter((r) => r.type === 'news'),
    resourceResults: results.filter((r) => r.type === 'resource'),
  }), [results])

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        placeholder="Search members, items, events, news, resources..."
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{result.title}</p>
                        {result.communityName && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Building2 className="h-2.5 w-2.5 mr-0.5" />
                            {result.communityName}
                          </Badge>
                        )}
                      </div>
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
                {memberResults.length > 0 && <CommandSeparator />}
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{result.title}</p>
                            {result.communityName && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <Building2 className="h-2.5 w-2.5 mr-0.5" />
                                {result.communityName}
                              </Badge>
                            )}
                          </div>
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
                {(memberResults.length > 0 || itemResults.length > 0) && <CommandSeparator />}
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{result.title}</p>
                            {result.communityName && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <Building2 className="h-2.5 w-2.5 mr-0.5" />
                                {result.communityName}
                              </Badge>
                            )}
                          </div>
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
                {(memberResults.length > 0 || itemResults.length > 0 || eventResults.length > 0) && <CommandSeparator />}
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{result.title}</p>
                            {result.communityName && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <Building2 className="h-2.5 w-2.5 mr-0.5" />
                                {result.communityName}
                              </Badge>
                            )}
                          </div>
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

            {resourceResults.length > 0 && (
              <>
                {(memberResults.length > 0 || itemResults.length > 0 || eventResults.length > 0 || newsResults.length > 0) && <CommandSeparator />}
                <CommandGroup heading="Resources">
                  {resourceResults.map((result) => {
                    const Icon = getIcon(result.type)
                    return (
                      <CommandItem
                        key={`resource-${result.id}`}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mr-2">
                          <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{result.title}</p>
                            {result.communityName && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <Building2 className="h-2.5 w-2.5 mr-0.5" />
                                {result.communityName}
                              </Badge>
                            )}
                          </div>
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
