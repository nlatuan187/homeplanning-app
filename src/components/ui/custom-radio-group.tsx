"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type RadioGroupContextValue = {
  value?: string
  onValueChange?: (value: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({})

function CustomRadioGroup({
  className,
  value,
  onValueChange,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div
        className={cn("grid gap-3", className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

function CustomRadioGroupItem({
  className,
  value,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string
}) {
  const { value: selectedValue, onValueChange } = React.useContext(RadioGroupContext)
  const isSelected = selectedValue === value
  
  return (
    <div
      className={cn(
        "flex items-center space-x-2",
        className
      )}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      <div
        className={cn(
          "h-4 w-4 rounded-full border",
          isSelected ? "border-primary bg-primary" : "border-input"
        )}
      >
        {isSelected && (
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="absolute h-2 w-2 rounded-full bg-white" />
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

export { CustomRadioGroup, CustomRadioGroupItem }
