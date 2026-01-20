'use client'

import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

interface SearchButtonProps {
  onClick?: () => void
}

export function SearchButton({ onClick }: SearchButtonProps) {
  const handleClick = () => {
    // Trigger Cmd+K event to open search
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
    onClick?.()
  }

  return (
    <Button
      variant="outline"
      className="relative h-9 w-full justify-start text-sm text-[#737373] dark:text-[#a3a3a3] sm:pr-12"
      onClick={handleClick}
    >
      <Search className="mr-2 h-4 w-4" />
      <span className="hidden lg:inline-flex">Search...</span>
      <span className="inline-flex lg:hidden">Search</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border border-[#e5e5e5] bg-[#f5f5f5] dark:border-[#404040] dark:bg-[#262626] px-1.5 font-mono text-[10px] font-medium text-[#525252] dark:text-[#a3a3a3] sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  )
}
