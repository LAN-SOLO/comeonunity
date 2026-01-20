# Style Guide

This document defines the design standards, component usage patterns, and documentation guidelines for the ComeOnUnity application.

**Last Updated:** January 2026
**Version:** 1.1

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Color Selection](#color-selection)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Components](#components)
6. [Dark Mode](#dark-mode)
7. [Icons](#icons)
8. [Animation & Motion](#animation--motion)
9. [Form Patterns](#form-patterns)
10. [Image Handling](#image-handling)
11. [Loading States](#loading-states)
12. [Error Handling UX](#error-handling-ux)
13. [Documentation Standards](#documentation-standards)

---

## Core Principles

1. **Minimalist Design** - Keep interfaces clean and uncluttered
2. **Consistency** - Use established patterns across all features
3. **Accessibility** - Ensure all components are keyboard navigable and screen reader friendly
4. **Dark Mode Support** - All components must work in both light and dark modes
5. **Mobile First** - Design for mobile screens first, then enhance for larger screens

---

## Color Selection

### Requirement

**All color selection options must always include a minimalist color picker for selecting individual colors.**

This applies to:
- Theme customization
- Category/tag color assignment
- User profile accent colors
- Community branding settings
- Any feature where users can select a color

### Implementation

Use the `ColorPicker` component from `@/components/ui/color-picker`:

```tsx
import { ColorPicker } from '@/components/ui/color-picker'

// Basic usage
<ColorPicker
  value={color}
  onChange={(newColor) => setColor(newColor)}
/>

// With custom preset colors
<ColorPicker
  value={color}
  onChange={setColor}
  presetColors={['#ef4444', '#22c55e', '#3b82f6', '#8b5cf6']}
/>
```

### ColorPicker Features

The color picker includes:
1. **Native color input** - Browser's native color picker for precise selection
2. **Hex input field** - Manual hex code entry
3. **Preset swatches** - Quick selection from predefined colors

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `'#000000'` | Current color value (hex format) |
| `onChange` | `(value: string) => void` | - | Callback when color changes |
| `presetColors` | `string[]` | Default palette | Array of preset hex colors |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable the picker |

### Default Preset Colors

```
#000000, #ffffff, #ef4444, #f97316, #eab308,
#22c55e, #14b8a6, #3b82f6, #8b5cf6, #ec4899
```

---

## Typography

### Font Stack

- **Primary (Sans)**: Geist Sans (`--font-geist-sans`)
- **Monospace**: Geist Mono (`--font-geist-mono`)

### Heading Sizes

| Element | Class | Usage |
|---------|-------|-------|
| Page title | `text-2xl font-semibold` | Main page headings |
| Section title | `text-lg font-medium` | Card/section headings |
| Subsection | `text-base font-medium` | Smaller section headings |
| Body | `text-sm` | Regular content |
| Caption | `text-xs text-muted-foreground` | Secondary/helper text |

### Text Colors

| Purpose | Class |
|---------|-------|
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Destructive | `text-destructive` |
| Link | `text-primary hover:underline` |

---

## Spacing

Use Tailwind's spacing scale consistently:

| Context | Spacing |
|---------|---------|
| Page padding | `p-6` |
| Card padding | `p-4` |
| Section gaps | `gap-6` or `space-y-6` |
| Element gaps | `gap-2` or `gap-3` |
| Tight spacing | `gap-1` or `gap-1.5` |

### Layout Patterns

```tsx
// Page layout
<div className="container max-w-4xl py-6 space-y-6">

// Card grid
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

// Form sections
<div className="space-y-4">
```

---

## Components

### Buttons

Use shadcn Button variants:
- `default` - Primary actions
- `secondary` - Secondary actions
- `outline` - Tertiary actions
- `ghost` - Subtle actions
- `destructive` - Delete/remove actions

```tsx
<Button>Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
```

### Form Inputs

- Always include labels using the `Label` component
- Use `Input` for text fields
- Use `Textarea` for multi-line text
- Use `Select` for dropdown selections
- Use `ColorPicker` for all color selections

### Cards

Use the `Card` component with consistent padding:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Dialogs & Modals

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Dark Mode

All components use CSS variables that automatically adapt to dark mode:
- Background: `bg-background`
- Foreground: `text-foreground`
- Muted: `text-muted-foreground`, `bg-muted`
- Border: `border-border`

The dark mode toggle adds `.dark` class to the root element.

### Avoiding Hardcoded Colors

Never use hardcoded colors like `bg-white` or `text-black`. Always use semantic variables:

```tsx
// Bad
<div className="bg-white text-black">

// Good
<div className="bg-background text-foreground">
```

---

## Icons

Use [Lucide React](https://lucide.dev) icons:
```tsx
import { IconName } from 'lucide-react'

<IconName className="h-4 w-4" />
```

Standard icon sizes:
- Small: `h-3 w-3`
- Default: `h-4 w-4`
- Medium: `h-5 w-5`
- Large: `h-6 w-6`

### Icon Button Pattern

```tsx
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

---

## Animation & Motion

### Transition Defaults

Use consistent transition timing:

```tsx
// Standard transition
className="transition-colors"

// With duration
className="transition-all duration-200"

// Hover effects
className="transition-transform hover:scale-105"
```

### Loading Animations

```tsx
// Spinner
<Loader2 className="h-4 w-4 animate-spin" />

// Skeleton
<Skeleton className="h-4 w-[200px]" />
```

### Reduced Motion

Always respect user preferences:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-* {
    animation: none !important;
  }
}
```

---

## Form Patterns

### Validation Feedback

Show validation errors below inputs:

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    className={errors.email ? "border-destructive" : ""}
  />
  {errors.email && (
    <p className="text-sm text-destructive">{errors.email.message}</p>
  )}
</div>
```

### Submit Button States

```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving...
    </>
  ) : (
    'Save Changes'
  )}
</Button>
```

### Form Layout

```tsx
<form className="space-y-4">
  {/* Form fields */}
  <div className="flex justify-end gap-2">
    <Button type="button" variant="outline">Cancel</Button>
    <Button type="submit">Submit</Button>
  </div>
</form>
```

---

## Image Handling

### Avatar Images

```tsx
<Avatar>
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>{user.name[0]}</AvatarFallback>
</Avatar>
```

### Responsive Images

Use Next.js Image component:
```tsx
import Image from 'next/image'

<Image
  src={imageSrc}
  alt="Description"
  width={400}
  height={300}
  className="rounded-lg object-cover"
/>
```

### Placeholder States

Always provide fallbacks for missing images.

---

## Loading States

### Page Loading

```tsx
// Skeleton for lists
<div className="space-y-3">
  {[...Array(3)].map((_, i) => (
    <Skeleton key={i} className="h-12 w-full" />
  ))}
</div>
```

### Button Loading

```tsx
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loading ? 'Loading...' : 'Submit'}
</Button>
```

### Inline Loading

```tsx
{isLoading ? (
  <span className="text-muted-foreground">Loading...</span>
) : (
  <span>{data}</span>
)}
```

---

## Error Handling UX

### Toast Notifications

```tsx
import { toast } from 'sonner'

// Success
toast.success('Changes saved successfully')

// Error
toast.error('Something went wrong')

// With description
toast.error('Failed to save', {
  description: 'Please try again later'
})
```

### Inline Errors

```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    {errorMessage}
  </AlertDescription>
</Alert>
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Package className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-medium">No items yet</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Get started by adding your first item.
  </p>
  <Button>Add Item</Button>
</div>
```

---

## Documentation Standards

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Documentation | `UPPER_SNAKE_CASE.md` | `STYLE_GUIDE.md` |
| Components | `kebab-case.tsx` | `color-picker.tsx` |
| Utilities | `kebab-case.ts` | `rate-limit.ts` |
| Types | `kebab-case.types.ts` | `community.types.ts` |

### Documentation Structure

All documentation files should include:
1. **Title** - Clear, descriptive title
2. **Last Updated** - Date of last modification
3. **Table of Contents** - For files > 100 lines
4. **Sections** - Organized with clear headings

### Code Examples

Always include working code examples:

```tsx
// Good: Complete, runnable example
import { Button } from '@/components/ui/button'

export function Example() {
  return <Button>Click me</Button>
}

// Bad: Incomplete snippet
<Button>Click me
```

### Version Numbers

Keep version numbers updated in:
- `CLAUDE.md` - Tech stack versions
- `docs/*.md` - Framework versions
- `package.json` - Dependency versions

**Current Stack:**
- Next.js 16
- React 19
- TypeScript (strict mode)
- Tailwind CSS v4

### Keeping Docs in Sync

When making changes:
1. Update relevant documentation immediately
2. Update `CLAUDE.md` if adding new patterns/components
3. Update this style guide if adding new design patterns
4. Version documentation changes with meaningful updates

### Documentation Index

See `docs/README.md` for the complete documentation index.
