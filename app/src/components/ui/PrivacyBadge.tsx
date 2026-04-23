// src/components/ui/PrivacyBadge.tsx

import { Shield } from "lucide-react";
import { clsx } from "clsx";

interface PrivacyBadgeProps {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function PrivacyBadge({
  label = "Shielded Transfer",
  className,
  size = "md",
}: PrivacyBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        "bg-purple-950/60 border border-purple-700/40 text-purple-300",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      <Shield className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {label}
    </span>
  );
}
