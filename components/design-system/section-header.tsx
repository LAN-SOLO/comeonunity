import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2',
      className
    )}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {action}
    </div>
  )
}
