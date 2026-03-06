import { useState, useEffect } from 'react';
import { Plane, X } from 'lucide-react';

const STORAGE_KEY = 'boomless-welcome-dismissed';

export function WelcomePopover() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-[6px]">
            <Plane className="text-primary-foreground w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Boomless Cruise Analysis</h2>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          This app helps you explore when a supersonic aircraft can fly
          <strong className="text-foreground"> without a sonic boom reaching the ground</strong>.
        </p>

        <ul className="text-sm text-muted-foreground space-y-1.5 mb-5">
          <li className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Use the sidebar to change altitude, speed, and temperature settings
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            See where your flight point is: boomless, subsonic, or audible boom
          </li>
        </ul>

        <button
          onClick={dismiss}
          className="w-full bg-primary text-primary-foreground text-sm font-medium py-2 rounded-[4px] hover:opacity-90 transition-opacity"
        >
          Start
        </button>
      </div>
    </div>
  );
}
