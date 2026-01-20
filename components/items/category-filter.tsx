'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Filter,
  X,
  Wrench,
  UtensilsCrossed,
  Monitor,
  Dumbbell,
  Flower2,
  Baby,
  BookOpen,
  Gamepad2,
  Music,
  Scissors,
  SprayCan,
  PartyPopper,
  Plane,
  MoreHorizontal,
} from 'lucide-react'

interface CategoryFilterProps {
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
}

interface Category {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const categories: Category[] = [
  { value: 'tools', label: 'Tools', icon: Wrench },
  { value: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed },
  { value: 'electronics', label: 'Electronics', icon: Monitor },
  { value: 'sports', label: 'Sports & Outdoors', icon: Dumbbell },
  { value: 'garden', label: 'Garden', icon: Flower2 },
  { value: 'baby', label: 'Baby & Kids', icon: Baby },
  { value: 'books', label: 'Books', icon: BookOpen },
  { value: 'games', label: 'Games & Toys', icon: Gamepad2 },
  { value: 'music', label: 'Music', icon: Music },
  { value: 'diy', label: 'DIY & Craft', icon: Scissors },
  { value: 'cleaning', label: 'Cleaning', icon: SprayCan },
  { value: 'party', label: 'Party Supplies', icon: PartyPopper },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
]

export function CategoryFilter({
  selectedCategories,
  onCategoriesChange,
}: CategoryFilterProps) {
  const [open, setOpen] = useState(false)

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== category))
    } else {
      onCategoriesChange([...selectedCategories, category])
    }
  }

  const clearAll = () => {
    onCategoriesChange([])
  }

  const getCategoryLabel = (value: string) => {
    return categories.find((c) => c.value === value)?.label || value
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9',
              selectedCategories.length > 0 && 'border-primary text-primary'
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            Category
            {selectedCategories.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {selectedCategories.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filter by Category</h4>
            {selectedCategories.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-auto py-1 px-2 text-xs"
              >
                Clear all
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-3 space-y-1">
              {categories.map((category) => (
                <label
                  key={category.value}
                  className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedCategories.includes(category.value)}
                    onCheckedChange={() => toggleCategory(category.value)}
                  />
                  <category.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{category.label}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedCategories.length > 0 && (
        <>
          {selectedCategories.slice(0, 3).map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleCategory(category)}
            >
              {getCategoryLabel(category)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {selectedCategories.length > 3 && (
            <Badge variant="outline">+{selectedCategories.length - 3} more</Badge>
          )}
        </>
      )}
    </div>
  )
}

export { categories }
