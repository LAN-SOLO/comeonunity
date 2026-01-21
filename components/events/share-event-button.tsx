'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Share2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ShareEventButtonProps {
  title: string
  description?: string
  location?: string
  startsAt: string
  endsAt: string
  allDay?: boolean
  eventDate?: string
}

export function ShareEventButton({
  title,
  description,
  location,
  startsAt,
  endsAt,
  allDay,
  eventDate,
}: ShareEventButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    try {
      const icsContent = generateICS({
        title,
        description,
        location,
        startsAt,
        endsAt,
        allDay,
      })

      // Create blob and download
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Calendar file downloaded')
    } catch {
      toast.error('Failed to generate calendar file')
    }
  }

  const handleShareLink = async () => {
    const shareUrl = window.location.href
    const shareText = eventDate
      ? `${title} - ${eventDate}${location ? ` at ${location}` : ''}`
      : title

    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        })
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }

    // Fall back to clipboard
    try {
      const clipboardText = `${title}\n${shareUrl}`
      await navigator.clipboard.writeText(clipboardText)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full" onClick={handleDownload}>
        <CalendarPlus className="h-4 w-4 mr-2" />
        Add to Calendar
      </Button>
      <Button variant="outline" className="w-full" onClick={handleShareLink}>
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Copied
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </>
        )}
      </Button>
    </div>
  )
}

function generateICS({
  title,
  description,
  location,
  startsAt,
  endsAt,
  allDay,
}: {
  title: string
  description?: string
  location?: string
  startsAt: string
  endsAt: string
  allDay?: boolean
}): string {
  const formatDate = (dateStr: string, isAllDay?: boolean): string => {
    const date = new Date(dateStr)
    if (isAllDay) {
      // All-day events use YYYYMMDD format
      return date.toISOString().slice(0, 10).replace(/-/g, '')
    }
    // Timed events use YYYYMMDDTHHMMSSZ format (UTC)
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@comeonunity`
  const now = formatDate(new Date().toISOString())

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ComeOnUnity//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ]

  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(startsAt, true)}`)
    lines.push(`DTEND;VALUE=DATE:${formatDate(endsAt, true)}`)
  } else {
    lines.push(`DTSTART:${formatDate(startsAt)}`)
    lines.push(`DTEND:${formatDate(endsAt)}`)
  }

  lines.push(`SUMMARY:${escapeText(title)}`)

  if (description) {
    lines.push(`DESCRIPTION:${escapeText(description)}`)
  }

  if (location) {
    lines.push(`LOCATION:${escapeText(location)}`)
  }

  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}
