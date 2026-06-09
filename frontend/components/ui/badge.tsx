import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
}

const variantClasses = {
  default: "bg-[#1B1B1B] text-white",
  success: "bg-green-100 text-green-800",
  warning: "bg-[#FAEEDA] text-[#BA7517]",
  destructive: "bg-red-100 text-red-800",
  outline: "border border-[var(--border)] text-[var(--foreground)] bg-transparent",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
