import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
    // Don't close the dropdown - keep it open for multiple selections
  }

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange([])
  }

  const selectedLabels = selected
    .map((value) => options.find((opt) => opt.value === value)?.label)
    .filter(Boolean)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-xs h-9 font-normal",
            !selected.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap overflow-hidden">
            {selected.length === 0 ? (
              <span>{placeholder}</span>
            ) : selected.length <= 2 ? (
              selectedLabels.map((label, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-[10px] px-1 py-0"
                >
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-xs">
                {selected.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {selected.length > 0 && (
              <X
                className="h-3 w-3 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-64 overflow-y-auto p-2">
          {options.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2 text-center">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) => {
                    // Only handle selection here - prevent double triggers
                    handleSelect(option.value)
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                />
                <label 
                  className="text-xs cursor-pointer flex-1"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSelect(option.value)
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                  }}
                >
                  {option.label}
                </label>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

