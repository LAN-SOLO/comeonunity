'use client'

import { Button } from '@/components/ui/button'
import { Share2, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ShareButtonProps {
  title: string
  text?: string
  url?: string
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const shareUrl = url || window.location.href

    // Try native share API first (mobile devices and macOS)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url: shareUrl,
        })
        return
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name === 'AbortError') return
      }
    }

    // Fall back to clipboard with title included
    try {
      const shareText = `${title}\n${shareUrl}`
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Copied
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </>
      )}
    </Button>
  )
}
