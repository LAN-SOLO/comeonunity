import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#000000] text-[#ffffff] shadow-md hover:bg-[#1f1f1f] hover:shadow-lg dark:bg-[#ffffff] dark:text-[#000000] dark:hover:bg-[#f5f5f5]",
        destructive:
          "bg-[#dc2626] text-[#ffffff] shadow-md hover:bg-[#b91c1c] hover:shadow-lg focus-visible:ring-red-500/50",
        outline:
          "border-2 border-[#e5e5e5] bg-[#ffffff] text-[#000000] shadow-sm hover:bg-[#f5f5f5] hover:border-[#d4d4d4] dark:border-[#404040] dark:bg-[#000000] dark:text-[#ffffff] dark:hover:bg-[#171717] dark:hover:border-[#525252]",
        secondary:
          "bg-[#f5f5f5] text-[#000000] shadow-sm hover:bg-[#e5e5e5] dark:bg-[#262626] dark:text-[#ffffff] dark:hover:bg-[#404040]",
        ghost:
          "text-[#525252] hover:bg-[#f5f5f5] hover:text-[#000000] dark:text-[#a3a3a3] dark:hover:bg-[#262626] dark:hover:text-[#ffffff]",
        link: "text-[#000000] underline-offset-4 hover:underline dark:text-[#ffffff]",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded px-8 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      style={style}
      {...props}
    />
  )
}

export { Button, buttonVariants }
