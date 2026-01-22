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
  Home,
  GraduationCap,
  Dumbbell,
  Palette,
  Briefcase,
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
      { value: 'furniture_assembly', label: 'Furniture Assembly' },
      { value: 'appliance_repair', label: 'Appliance Repair' },
      { value: 'tiling', label: 'Tiling' },
      { value: 'flooring', label: 'Flooring' },
      { value: 'wallpapering', label: 'Wallpapering' },
      { value: 'locksmith', label: 'Locksmith' },
      { value: 'welding', label: 'Welding' },
      { value: 'roofing', label: 'Roofing' },
      { value: 'masonry', label: 'Masonry' },
      { value: 'window_repair', label: 'Window Repair' },
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
      { value: 'smart_home', label: 'Smart Home Setup' },
      { value: 'tv_setup', label: 'TV / Streaming Setup' },
      { value: 'data_recovery', label: 'Data Recovery' },
      { value: 'virus_removal', label: 'Virus Removal' },
      { value: 'web_design', label: 'Web Design' },
      { value: 'programming', label: 'Programming' },
      { value: 'social_media', label: 'Social Media Help' },
      { value: 'online_shopping', label: 'Online Shopping Help' },
      { value: 'video_calls', label: 'Video Calls Setup' },
      { value: 'gaming_setup', label: 'Gaming Setup' },
    ],
  },
  {
    name: 'Languages',
    icon: Languages,
    skills: [
      { value: 'german_help', label: 'German' },
      { value: 'english_help', label: 'English' },
      { value: 'french_help', label: 'French' },
      { value: 'spanish_help', label: 'Spanish' },
      { value: 'italian_help', label: 'Italian' },
      { value: 'portuguese_help', label: 'Portuguese' },
      { value: 'russian_help', label: 'Russian' },
      { value: 'chinese_help', label: 'Chinese' },
      { value: 'arabic_help', label: 'Arabic' },
      { value: 'turkish_help', label: 'Turkish' },
      { value: 'polish_help', label: 'Polish' },
      { value: 'dutch_help', label: 'Dutch' },
      { value: 'translation', label: 'Translation Services' },
      { value: 'sign_language', label: 'Sign Language' },
    ],
  },
  {
    name: 'Care',
    icon: Heart,
    skills: [
      { value: 'pet_sitting', label: 'Pet Sitting' },
      { value: 'dog_walking', label: 'Dog Walking' },
      { value: 'plant_care', label: 'Plant Care' },
      { value: 'elderly_assistance', label: 'Elderly Assistance' },
      { value: 'childcare', label: 'Childcare' },
      { value: 'babysitting', label: 'Babysitting' },
      { value: 'first_aid', label: 'First Aid' },
      { value: 'nursing', label: 'Nursing Care' },
      { value: 'companionship', label: 'Companionship' },
      { value: 'meal_preparation', label: 'Meal Preparation' },
      { value: 'medication_reminder', label: 'Medication Reminders' },
      { value: 'disability_support', label: 'Disability Support' },
    ],
  },
  {
    name: 'Transport',
    icon: Car,
    skills: [
      { value: 'driving', label: 'Driving' },
      { value: 'moving_help', label: 'Moving Help' },
      { value: 'errands', label: 'Errands' },
      { value: 'airport_transfer', label: 'Airport Transfer' },
      { value: 'grocery_shopping', label: 'Grocery Shopping' },
      { value: 'pharmacy_pickup', label: 'Pharmacy Pickup' },
      { value: 'parcel_delivery', label: 'Parcel Delivery' },
      { value: 'bike_repair', label: 'Bike Repair' },
      { value: 'car_maintenance', label: 'Car Maintenance' },
      { value: 'heavy_lifting', label: 'Heavy Lifting' },
    ],
  },
  {
    name: 'Home & Household',
    icon: Home,
    skills: [
      { value: 'cooking', label: 'Cooking' },
      { value: 'baking', label: 'Baking' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'laundry', label: 'Laundry' },
      { value: 'ironing', label: 'Ironing' },
      { value: 'organizing', label: 'Organizing / Decluttering' },
      { value: 'sewing', label: 'Sewing / Alterations' },
      { value: 'interior_design', label: 'Interior Design' },
      { value: 'house_sitting', label: 'House Sitting' },
      { value: 'key_holding', label: 'Key Holding' },
    ],
  },
  {
    name: 'Education & Tutoring',
    icon: GraduationCap,
    skills: [
      { value: 'tutoring', label: 'General Tutoring' },
      { value: 'math_tutoring', label: 'Math Tutoring' },
      { value: 'science_tutoring', label: 'Science Tutoring' },
      { value: 'language_tutoring', label: 'Language Tutoring' },
      { value: 'music_lessons', label: 'Music Lessons' },
      { value: 'art_lessons', label: 'Art Lessons' },
      { value: 'homework_help', label: 'Homework Help' },
      { value: 'exam_preparation', label: 'Exam Preparation' },
      { value: 'reading_help', label: 'Reading Help' },
      { value: 'writing_help', label: 'Writing Help' },
    ],
  },
  {
    name: 'Health & Fitness',
    icon: Dumbbell,
    skills: [
      { value: 'fitness', label: 'Fitness Training' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'meditation', label: 'Meditation' },
      { value: 'nutrition', label: 'Nutrition Advice' },
      { value: 'personal_training', label: 'Personal Training' },
      { value: 'running_buddy', label: 'Running Buddy' },
      { value: 'swimming', label: 'Swimming Lessons' },
      { value: 'massage', label: 'Massage' },
      { value: 'physiotherapy', label: 'Physiotherapy' },
      { value: 'mental_health', label: 'Mental Health Support' },
    ],
  },
  {
    name: 'Creative & Arts',
    icon: Palette,
    skills: [
      { value: 'photography', label: 'Photography' },
      { value: 'videography', label: 'Videography' },
      { value: 'graphic_design', label: 'Graphic Design' },
      { value: 'drawing', label: 'Drawing' },
      { value: 'crafts', label: 'Crafts' },
      { value: 'knitting', label: 'Knitting / Crocheting' },
      { value: 'pottery', label: 'Pottery' },
      { value: 'calligraphy', label: 'Calligraphy' },
      { value: 'music_performance', label: 'Music Performance' },
      { value: 'event_planning', label: 'Event Planning' },
    ],
  },
  {
    name: 'Professional Services',
    icon: Briefcase,
    skills: [
      { value: 'accounting', label: 'Accounting' },
      { value: 'tax_help', label: 'Tax Help' },
      { value: 'legal_advice', label: 'Legal Advice' },
      { value: 'resume_writing', label: 'Resume Writing' },
      { value: 'job_coaching', label: 'Job Coaching' },
      { value: 'notary', label: 'Notary Services' },
      { value: 'form_filling', label: 'Form Filling Help' },
      { value: 'bureaucracy_help', label: 'Bureaucracy Help' },
      { value: 'insurance_advice', label: 'Insurance Advice' },
      { value: 'real_estate', label: 'Real Estate Advice' },
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

// Custom skill prefix - skills starting with this are user-defined
const CUSTOM_SKILL_PREFIX = 'custom:'

// Helper function to check if a skill is a predefined one
function isPreDefinedSkill(value: string): boolean {
  for (const category of skillCategories) {
    if (category.skills.find((s) => s.value === value)) {
      return true
    }
  }
  return false
}

// Helper function to check if a skill is custom
function isCustomSkill(value: string): boolean {
  return value.startsWith(CUSTOM_SKILL_PREFIX)
}

// Helper function to get display name of a skill (handles both predefined and custom)
function getSkillDisplayName(value: string): string {
  // Check if it's a custom skill
  if (isCustomSkill(value)) {
    return value.substring(CUSTOM_SKILL_PREFIX.length)
  }
  // Check predefined skills
  for (const category of skillCategories) {
    const skill = category.skills.find((s) => s.value === value)
    if (skill) return skill.label
  }
  return value
}

// Helper function to create a custom skill value from user input
function createCustomSkillValue(name: string): string {
  return `${CUSTOM_SKILL_PREFIX}${name}`
}

export {
  skillCategories,
  CUSTOM_SKILL_PREFIX,
  isPreDefinedSkill,
  isCustomSkill,
  getSkillDisplayName,
  createCustomSkillValue
}
