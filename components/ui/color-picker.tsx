'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

interface ColorPickerProps {
  value?: string
  onChange?: (value: string) => void
  presetColors?: string[]
  className?: string
  disabled?: boolean
}

const DEFAULT_PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
]

export function ColorPicker({
  value = '#000000',
  onChange,
  presetColors = DEFAULT_PRESET_COLORS,
  className,
  disabled = false,
}: ColorPickerProps) {
  const [color, setColor] = React.useState(value)

  React.useEffect(() => {
    setColor(value)
  }, [value])

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    onChange?.(newColor)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start gap-2', className)}
          disabled={disabled}
        >
          <div
            className="h-4 w-4 rounded border border-neutral-200 dark:border-neutral-700"
            style={{ backgroundColor: color }}
          />
          <span className="flex-1 text-left text-sm">{color}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Native color input for precise selection */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Custom Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-neutral-200 bg-transparent p-0.5 dark:border-neutral-700"
              />
              <Input
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#000000"
                className="h-9 flex-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* Preset color swatches */}
          {presetColors.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Presets</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {presetColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className={cn(
                      'h-7 w-7 rounded border-2 transition-all hover:scale-110',
                      color === presetColor
                        ? 'border-neutral-900 dark:border-white'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => handleColorChange(presetColor)}
                    title={presetColor}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ColorSwatchProps {
  color: string
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function ColorSwatch({ color, selected, onClick, className }: ColorSwatchProps) {
  return (
    <button
      type="button"
      className={cn(
        'h-7 w-7 rounded border-2 transition-all hover:scale-110',
        selected
          ? 'border-neutral-900 dark:border-white'
          : 'border-transparent',
        className
      )}
      style={{ backgroundColor: color }}
      onClick={onClick}
      title={color}
    />
  )
}
