import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, change, icon, className }: StatCardProps) {
  return (
    <Card className={cn(
      'p-5 transition-shadow hover:shadow-[var(--shadow-apple-md)]',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {change && (
            <p className={cn(
              'text-sm font-medium',
              change.trend === 'up' && 'text-[#34C759]',
              change.trend === 'down' && 'text-[#FF3B30]',
              change.trend === 'neutral' && 'text-muted-foreground'
            )}>
              {change.trend === 'up' && '\u2191'}
              {change.trend === 'down' && '\u2193'}
              {' '}{Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
