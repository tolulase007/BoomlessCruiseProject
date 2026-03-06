interface TryScriptTabProps {
  pythonFiddleUrl: string;
  isDark: boolean;
}

export function TryScriptTab({ pythonFiddleUrl, isDark }: TryScriptTabProps) {
  const url = (() => {
    const u = new URL(pythonFiddleUrl);
    u.searchParams.set('theme', isDark ? 'dark' : 'light');
    return u.toString();
  })();

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <p className="text-xs text-muted-foreground px-4 py-2 border-b border-border bg-muted/30">
        Click Run All when ready.
      </p>
      <iframe
        src={url}
        title="Run Boomless Cruise script in Python"
        className="w-full border-0 flex-1 min-h-0"
        style={{ height: 'calc(100vh - 3.5rem)' }}
      />
    </div>
  );
}
