import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TryScriptTabProps {
  pythonFiddleUrl: string;
  isDark: boolean;
}

export function TryScriptTab({ pythonFiddleUrl, isDark }: TryScriptTabProps) {
  const themedUrl = useMemo(() => {
    const u = new URL(pythonFiddleUrl);
    u.searchParams.set('theme', isDark ? 'dark' : 'light');
    return u.toString();
  }, [pythonFiddleUrl, isDark]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [frozenUrl, setFrozenUrl] = useState<string | null>(null);
  const [lockedThemeIsDark, setLockedThemeIsDark] = useState<boolean | null>(null);
  const hasInteractedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const iframeUrl = hasInteracted && frozenUrl ? frozenUrl : themedUrl;

  const lockIframeSession = useCallback(() => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    setFrozenUrl(themedUrl);
    setLockedThemeIsDark(isDark);
    setHasInteracted(true);
  }, [isDark, themedUrl]);

  useEffect(() => {
    const onWindowBlur = () => {
      window.setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          lockIframeSession();
        }
      }, 0);
    };

    window.addEventListener('blur', onWindowBlur);
    return () => window.removeEventListener('blur', onWindowBlur);
  }, [lockIframeSession]);

  const shouldInvertVisually =
    hasInteracted && lockedThemeIsDark != null && lockedThemeIsDark !== isDark;
  const iframeFilter = shouldInvertVisually
    ? 'invert(1) hue-rotate(180deg) contrast(0.92) brightness(1.04)'
    : 'none';

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      onPointerDownCapture={lockIframeSession}
    >
      <p className="text-xs text-muted-foreground px-4 py-2 border-b border-border bg-muted/30">
        {hasInteracted
          ? 'Click Run All when ready. Theme sync now uses visual mode to preserve unsaved editor changes.'
          : 'Click Run All when ready.'}
      </p>
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        title="Run Boomless Cruise script in Python"
        className="w-full border-0 flex-1 min-h-0"
        onFocus={lockIframeSession}
        onPointerDown={lockIframeSession}
        style={{
          height: 'calc(100vh - 3.5rem)',
          filter: iframeFilter,
          transition: 'filter 180ms ease',
        }}
      />
    </div>
  );
}
