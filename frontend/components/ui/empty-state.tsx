import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-[#FAEEDA] flex items-center justify-center mb-4">
        <Icon size={32} className="text-[#EF9F27]" strokeWidth={1.5} />
      </div>
      <p className="font-semibold text-[#1B1B1B] text-base mb-1">{title}</p>
      {description && (
        <p className="text-sm text-[#9B9B9B] max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-xl hover:bg-[#2d2d2d] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
