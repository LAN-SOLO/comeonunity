'use client'

interface LogoTextProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LogoText({ size = 'md', className = '' }: LogoTextProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl',
  }

  return (
    <span className={`font-bold tracking-tight ${sizeClasses[size]} ${className}`}>
      <span className="text-foreground">ComeOn</span>
      <span style={{ color: '#E53935' }}>U</span>
      <span style={{ color: '#FB8C00' }}>n</span>
      <span style={{ color: '#FDD835' }}>i</span>
      <span style={{ color: '#43A047' }}>t</span>
      <span style={{ color: '#1E88E5' }}>y</span>
    </span>
  )
}
