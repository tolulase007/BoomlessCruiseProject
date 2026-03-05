import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type DarkModeToggleProps = {
  isDark: boolean;
  onToggle: () => void;
};

export function DarkModeToggle({ isDark, onToggle }: DarkModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "h-8 w-8 rounded-[4px] flex items-center justify-center",
        "bg-background border border-border",
        "hover:bg-accent hover:text-accent-foreground",
        "transition-colors"
      )}
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
