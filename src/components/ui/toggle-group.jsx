import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const ToggleGroupContext = React.createContext({
  variant: 'default',
  size: 'default',
  value: null,
  onValueChange: () => {},
})

const ToggleGroup = React.forwardRef(
  ({ className, variant, size, children, value, onValueChange, type = "single", ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, value, onValueChange }}>
        {children}
      </ToggleGroupContext.Provider>
    </div>
  )
)
ToggleGroup.displayName = "ToggleGroup"

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const ToggleGroupItem = React.forwardRef(
  ({ className, children, value, variant, size, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    const isSelected = context.value === value

    return (
      <button
        ref={ref}
        type="button"
        data-state={isSelected ? "on" : "off"}
        className={cn(
          toggleGroupItemVariants({
            variant: context.variant || variant,
            size: context.size || size,
          }),
          className
        )}
        onClick={() => context.onValueChange && context.onValueChange(value)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }