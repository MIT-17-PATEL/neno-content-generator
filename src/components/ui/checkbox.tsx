"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, indeterminate = false, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex items-center justify-center h-4 w-4 rounded border transition-colors cursor-pointer select-none",
          checked || indeterminate
            ? "bg-orange-600 border-orange-600 text-white"
            : "bg-white border-slate-300 hover:border-slate-400 text-transparent",
          disabled && "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200",
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
        {checked && !indeterminate && <Check className="h-3 w-3 stroke-[3]" />}
        {indeterminate && <Minus className="h-3 w-3 stroke-[3]" />}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
