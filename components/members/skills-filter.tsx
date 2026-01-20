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
  Monitor,
  Languages,
  Heart,
  Car,
  MoreHorizontal,
} from 'lucide-react'

interface SkillsFilterProps {
  selectedSkills: string[]
  onSkillsChange: (skills: string[]) => void
}

interface SkillCategory {
  name: string
  icon: React.ComponentType<{ className?: string }>
  skills: { value: string; label: string }[]
}

const skillCategories: SkillCategory[] = [
  {
    name: 'Handwork',
    icon: Wrench,
    skills: [
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'carpentry', label: 'Carpentry' },
      { value: 'painting', label: 'Painting' },
      { value: 'gardening', label: 'Gardening' },
    ],
  },
  {
    name: 'Tech',
    icon: Monitor,
    skills: [
      { value: 'computer_help', label: 'Computer Help' },
      { value: 'smartphone_help', label: 'Smartphone Help' },
      { value: 'printer_setup', label: 'Printer Setup' },
      { value: 'wifi_setup', label: 'WiFi Setup' },
    ],
  },
  {
    name: 'Languages',
    icon: Languages,
    skills: [
      { value: 'german_help', label: 'German Help' },
      { value: 'english_help', label: 'English Help' },
      { value: 'translation', label: 'Translation' },
    ],
  },
  {
    name: 'Care',
    icon: Heart,
    skills: [
      { value: 'pet_sitting', label: 'Pet Sitting' },
      { value: 'plant_care', label: 'Plant Care' },
      { value: 'elderly_assistance', label: 'Elderly Assistance' },
      { value: 'childcare', label: 'Childcare' },
    ],
  },
  {
    name: 'Transport',
    icon: Car,
    skills: [
      { value: 'driving', label: 'Driving' },
      { value: 'moving_help', label: 'Moving Help' },
      { value: 'errands', label: 'Errands' },
    ],
  },
  {
    name: 'Other',
    icon: MoreHorizontal,
    skills: [
      { value: 'cooking', label: 'Cooking' },
      { value: 'tutoring', label: 'Tutoring' },
      { value: 'music_lessons', label: 'Music Lessons' },
      { value: 'fitness', label: 'Fitness' },
      { value: 'photography', label: 'Photography' },
    ],
  },
]

export function SkillsFilter({ selectedSkills, onSkillsChange }: SkillsFilterProps) {
  const [open, setOpen] = useState(false)

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      onSkillsChange(selectedSkills.filter((s) => s !== skill))
    } else {
      onSkillsChange([...selectedSkills, skill])
    }
  }

  const clearAll = () => {
    onSkillsChange([])
  }

  const getSkillLabel = (value: string) => {
    for (const category of skillCategories) {
      const skill = category.skills.find((s) => s.value === value)
      if (skill) return skill.label
    }
    return value
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
              selectedSkills.length > 0 && 'border-primary text-primary'
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            Skills
            {selectedSkills.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {selectedSkills.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filter by Skills</h4>
            {selectedSkills.length > 0 && (
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
            <div className="p-3 space-y-4">
              {skillCategories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center gap-2 mb-2">
                    <category.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {category.skills.map((skill) => (
                      <label
                        key={skill.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedSkills.includes(skill.value)}
                          onCheckedChange={() => toggleSkill(skill.value)}
                        />
                        <span className="text-sm">{skill.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedSkills.length > 0 && (
        <>
          {selectedSkills.slice(0, 3).map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleSkill(skill)}
            >
              {getSkillLabel(skill)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {selectedSkills.length > 3 && (
            <Badge variant="outline">+{selectedSkills.length - 3} more</Badge>
          )}
        </>
      )}
    </div>
  )
}

export { skillCategories }
