import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-[#171717] placeholder:text-[#a3a3a3] selection:bg-[#dbeafe] selection:text-[#1e3a8a] dark:selection:bg-[#1e3a8a] dark:selection:text-[#dbeafe] h-10 w-full min-w-0 rounded border border-[#d4d4d4] bg-[#ffffff] px-3 py-2 text-sm text-[#171717] shadow-sm transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#404040] dark:bg-[#171717] dark:text-[#fafafa] dark:placeholder:text-[#737373]",
        "hover:border-[#a3a3a3] dark:hover:border-[#525252]",
        "focus:border-[#171717] focus:ring-4 focus:ring-[#171717]/10 dark:focus:border-[#ffffff] dark:focus:ring-[#ffffff]/10",
        "aria-invalid:border-[#ef4444] aria-invalid:ring-[#ef4444]/20 dark:aria-invalid:border-[#ef4444] dark:aria-invalid:ring-[#ef4444]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
