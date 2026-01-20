import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListRowProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  value?: string | React.ReactNode
  showChevron?: boolean
  onClick?: () => void
  destructive?: boolean
  className?: string
}

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  showChevron = true,
  onClick,
  destructive,
  className,
}: ListRowProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3',
        'bg-card border-b border-border last:border-b-0',
        'transition-colors',
        onClick && 'hover:bg-muted/50 cursor-pointer press-effect',
        className
      )}
    >
      {icon && (
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          destructive ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'bg-primary/10 text-primary'
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1 text-left">
        <p className={cn(
          'font-medium',
          destructive && 'text-[#FF3B30]'
        )}>
          {title}
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {value && (
        <span className="text-sm text-muted-foreground">{value}</span>
      )}
      {showChevron && onClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </Component>
  )
}
