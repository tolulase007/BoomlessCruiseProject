import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { SimulationParameters, defaultParameters, runSimulation, SimulationResult } from './physics';
import { DarkModeToggle } from './components/DarkModeToggle';
import { Plane } from 'lucide-react';
import { DESMOS_GRAPH_URL, DESMOS_OPACITY, API_BASE_URL, PYTHON_FIDDLE_URL } from './config';
import { BackgroundEnvelope } from './components/BackgroundEnvelope';
import { WelcomePopover } from './components/WelcomePopover';

const SimulationView = lazy(() =>
  import('./components/SimulationView').then((m) => ({ default: m.SimulationView }))
);
const TryScriptTab = lazy(() =>
  import('./components/TryScriptTab').then((m) => ({ default: m.TryScriptTab }))
);

const desmosEmbedUrl = DESMOS_GRAPH_URL
  ? `${DESMOS_GRAPH_URL.replace(/\?.*$/, '')}?embed`
  : '';

function getInitialIsDark(): boolean {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return savedTheme === 'dark' || (!savedTheme && prefersDark);
}

function App() {
  const [parameters, setParameters] = useState<SimulationParameters>(defaultParameters);
  const [usePythonBackend, setUsePythonBackend] = useState(false);
  const [apiResult, setApiResult] = useState<SimulationResult | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);
  const prevUsePythonBackend = useRef(false);
  const [activeTab, setActiveTab] = useState<'simulation' | 'tryScript'>('simulation');
  const [isDark, setIsDark] = useState(getInitialIsDark);
  const [desmosReady, setDesmosReady] = useState(false);
  const [desmosLoaded, setDesmosLoaded] = useState(false);

  const tsResult = useMemo(() => runSimulation(parameters), [parameters]);

  // Defer Desmos iframe briefly so the site paints and stays responsive; then it fades in when loaded.
  useEffect(() => {
    if (!desmosEmbedUrl) return;
    try {
      const origin = new URL(desmosEmbedUrl).origin;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch {
      /* ignore */
    }
    let cancelled = false;
    const addIframe = () => {
      if (!cancelled) setDesmosReady(true);
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(addIframe, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const id = setTimeout(addIframe, 2000);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Sync app theme when Python Fiddle iframe sends a theme-change message (e.g. user toggles theme inside the embed).
  // Expected message: { type: 'theme', theme: 'dark' | 'light' } from origin https://python-fiddle.com
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== 'https://python-fiddle.com') return;
      const data = event.data;
      if (data && typeof data === 'object' && data.type === 'theme' && (data.theme === 'dark' || data.theme === 'light')) {
        setIsDark(data.theme === 'dark');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!usePythonBackend || !API_BASE_URL) {
      prevUsePythonBackend.current = false;
      setApiResult(null);
      setApiError(false);
      return;
    }
    const isFirstLoadAfterCheck = !prevUsePythonBackend.current;
    if (isFirstLoadAfterCheck) {
      setShowLoadingMessage(true);
      prevUsePythonBackend.current = true;
    }
    const url = `${API_BASE_URL.replace(/\/$/, '')}/simulate`;
    setApiLoading(true);
    setApiError(false);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parameters),
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: SimulationResult) => {
        setApiResult(data);
        setApiError(false);
      })
      .catch(() => {
        setApiResult(null);
        setApiError(true);
      })
      .finally(() => {
        setApiLoading(false);
        setShowLoadingMessage(false);
      });
  }, [usePythonBackend, API_BASE_URL, parameters]);

  const result: SimulationResult =
    usePythonBackend && API_BASE_URL && apiResult != null ? apiResult : tsResult;
  const usingPythonFallback = usePythonBackend && API_BASE_URL && apiError;

  return (
    <>
      {/* Lightweight SVG background: shows immediately, no iframe blocking; dims when Desmos fades in */}
      {desmosEmbedUrl && (
        <BackgroundEnvelope
          result={result}
          opacity={desmosLoaded ? 0.05 : 0.14}
        />
      )}
      {/* Desmos iframe: sandboxed (forces a separate OS process in Chromium so it can't block the page) */}
      {desmosEmbedUrl && desmosReady && (
        <div
          className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
          aria-hidden
          style={{
            contain: 'strict',
            opacity: desmosLoaded ? DESMOS_OPACITY : 0,
            transition: 'opacity 1.8s ease-in',
          }}
        >
          <iframe
            src={desmosEmbedUrl}
            className="w-full h-full"
            title=""
            loading="lazy"
            sandbox="allow-scripts"
            onLoad={() => setDesmosLoaded(true)}
          />
        </div>
      )}
      <div
        className={`relative z-10 min-h-screen flex flex-col ${desmosEmbedUrl ? 'bg-transparent' : 'bg-background'}`}
      >
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={`h-14 border-b border-border px-8 flex items-center justify-between ${desmosEmbedUrl ? 'bg-card/90' : 'bg-card'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-primary flex items-center justify-center rounded-[4px]">
              <Plane className="text-primary-foreground w-4 h-4" />
            </div>
            <h1 className="font-bold text-sm tracking-tight uppercase">Boomless Cruise Analysis</h1>
          </div>
          <nav className="flex items-center gap-1" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('simulation')}
              className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
                activeTab === 'simulation'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Simulation
            </button>
            {PYTHON_FIDDLE_URL && (
              <button
                type="button"
                onClick={() => setActiveTab('tryScript')}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
                  activeTab === 'tryScript'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Try the script
              </button>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {API_BASE_URL && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={usePythonBackend}
                onChange={(e) => setUsePythonBackend(e.target.checked)}
                className="rounded border-border"
              />
              Use Python
            </label>
          )}
          {apiLoading && showLoadingMessage && (
            <span className="text-xs text-muted-foreground">Loading from Python backend…</span>
          )}
          {!apiLoading && usingPythonFallback && (
            <span className="text-xs text-amber-600 dark:text-amber-400">Python backend unavailable, using TypeScript.</span>
          )}
          <DarkModeToggle isDark={isDark} onToggle={() => setIsDark((prev) => !prev)} />
        </div>
      </header>

      {/* ── Body (lazy so shell paints first) ──────────────────────────── */}
      {activeTab === 'simulation' && (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center min-h-[320px]">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading simulation…</span>
              </div>
            </div>
          }
        >
          <SimulationView
            parameters={parameters}
            onParametersChange={setParameters}
            result={result}
            desmosEmbedUrl={desmosEmbedUrl}
          />
        </Suspense>
      )}

      {activeTab === 'tryScript' && PYTHON_FIDDLE_URL && (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          }
        >
          <TryScriptTab pythonFiddleUrl={PYTHON_FIDDLE_URL} isDark={isDark} />
        </Suspense>
      )}
    </div>
    <WelcomePopover />
    </>
  );
}

export default App;
