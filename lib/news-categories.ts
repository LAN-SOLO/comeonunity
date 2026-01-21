import {
  Megaphone,
  Calendar,
  AlertTriangle,
  FileText,
  RefreshCw,
  Wrench,
  Users,
} from 'lucide-react'

export const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  general: FileText,
  announcement: Megaphone,
  update: RefreshCw,
  important: AlertTriangle,
  event: Calendar,
  maintenance: Wrench,
  social: Users,
}

export const categoryLabels: Record<string, string> = {
  general: 'General',
  announcement: 'Announcement',
  update: 'Update',
  important: 'Important',
  event: 'Event',
  maintenance: 'Maintenance',
  social: 'Social',
}

export const categoryColors: Record<string, string> = {
  general: 'bg-gray-500 text-white',
  announcement: 'bg-blue-500 text-white',
  update: 'bg-cyan-500 text-white',
  important: 'bg-red-500 text-white',
  event: 'bg-purple-500 text-white',
  maintenance: 'bg-amber-500 text-white',
  social: 'bg-green text-white',
}

export const categories = [
  { value: 'general', label: 'General' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'update', label: 'Update' },
  { value: 'important', label: 'Important' },
  { value: 'event', label: 'Event' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'social', label: 'Social' },
]
