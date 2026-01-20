import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-neutral-400 dark:placeholder:text-neutral-500 flex field-sizing-content min-h-20 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900",
        "hover:border-neutral-300 dark:hover:border-neutral-600",
        "focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10 dark:focus:border-white dark:focus:ring-white/10",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/20 dark:aria-invalid:border-red-500 dark:aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
