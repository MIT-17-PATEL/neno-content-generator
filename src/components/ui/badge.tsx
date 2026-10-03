import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "primary"
    | "brand"
    | "success"
    | "warning"
    | "destructive"
    | "outline"
    | "secondary"
    | "info";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    primary: "bg-orange-50 text-orange-700 border-orange-200 font-medium",
    brand: "bg-orange-50 text-orange-700 border-orange-200 font-medium",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium",
    warning: "bg-amber-50 text-amber-700 border-amber-200 font-medium",
    destructive: "bg-red-50 text-red-700 border-red-200 font-medium",
    outline: "border-slate-300 text-slate-600 bg-white",
    info: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
