import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { SimulationParameters, defaultParameters, runSimulation, SimulationResult } from './physics';
import { DarkModeToggle } from './components/DarkModeToggle';
import { CircleHelp, Plane, Smartphone, RotateCw } from 'lucide-react';
import { DESMOS_GRAPH_URL, DESMOS_OPACITY, API_BASE_URL, PYTHON_FIDDLE_URL } from './config';
import { WelcomePopover } from './components/WelcomePopover';
import { Analytics } from '@vercel/analytics/react';

const SimulationView = lazy(() =>
  import('./components/SimulationView').then((m) => ({ default: m.SimulationView }))
);
const TryScriptTab = lazy(() =>
  import('./components/TryScriptTab').then((m) => ({ default: m.TryScriptTab }))
);

const ENABLE_DESMOS_BACKGROUND = false;
const desmosEmbedUrl = ENABLE_DESMOS_BACKGROUND && DESMOS_GRAPH_URL
  ? `${DESMOS_GRAPH_URL.replace(/\?.*$/, '')}?embed`
  : '';
const DESMOS_TIMING_TAG = '[desmos-timing]';
const DESMOS_BOOT_DELAY_MS = 50;
const DESMOS_MIN_GRAPH_FIRST_MS = 0;
const TRACK_PARAM_NAME = 'src';
const TRACK_EVENT_START = 'session_start';
const TRACK_EVENT_END = 'session_end';
const ROTATE_HINT_DISMISS_KEY = 'ui:rotate-hint-dismissed';

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isDesmosTimingEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get('desmosTiming');
  const envValue = String((import.meta.env as Record<string, unknown>).VITE_DEBUG_DESMOS_TIMING ?? '').toLowerCase();
  return queryValue === '1' || queryValue === 'true' || envValue === '1' || envValue === 'true';
}

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
  const [welcomeHintClicks, setWelcomeHintClicks] = useState(0);
  const [showHintNudge, setShowHintNudge] = useState(false);
  const prevUsePythonBackend = useRef(false);
  const [activeTab, setActiveTab] = useState<'simulation' | 'tryScript'>('simulation');
  const [isDark, setIsDark] = useState(getInitialIsDark);
  const [desmosReady, setDesmosReady] = useState(false);
  const [desmosLoaded, setDesmosLoaded] = useState(false);
  const [desmosVisible, setDesmosVisible] = useState(false);
  const [rotateHintDismissed, setRotateHintDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(ROTATE_HINT_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const appStartMsRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const desmosLayerRef = useRef<HTMLDivElement | null>(null);
  const desmosIframeMountedRef = useRef(false);
  const desmosTimingEnabled = useMemo(() => isDesmosTimingEnabled(), []);

  useEffect(() => {
    if (!API_BASE_URL) return;
    const IDLE_BEFORE_HINT_MS = 25000;
    let timeoutId: number | undefined;

    const scheduleHintNudge = () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
      setShowHintNudge(false);
      timeoutId = window.setTimeout(() => {
        setShowHintNudge(true);
      }, IDLE_BEFORE_HINT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'pointermove',
      'keydown',
      'scroll',
      'touchstart',
    ];

    scheduleHintNudge();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, scheduleHintNudge, { passive: true }));

    return () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, scheduleHintNudge));
    };
  }, [API_BASE_URL]);

  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      const mq = window.matchMedia('(max-width: 900px) and (orientation: portrait)');
      setIsMobilePortrait(mq.matches);
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true } as AddEventListenerOptions);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get(TRACK_PARAM_NAME);
    if (!source) return;

    const trackUrl = '/api/track';
    const sessionStorageKey = `track-session:${source}`;
    const storedSessionId = sessionStorage.getItem(sessionStorageKey);
    const sessionId = storedSessionId ?? createSessionId();
    if (!storedSessionId) {
      sessionStorage.setItem(sessionStorageKey, sessionId);
    }

    const startFlagKey = `track-start-sent:${sessionId}`;
    const endFlagKey = `track-end-sent:${sessionId}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;

    const sendEvent = (eventType: string) => {
      const payload = JSON.stringify({
        event: eventType,
        session_id: sessionId,
        source,
        path: window.location.pathname,
        timezone,
      });
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(trackUrl, new Blob([payload], { type: 'application/json' }));
        return;
      }
      void fetch(trackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    };

    if (!sessionStorage.getItem(startFlagKey)) {
      sendEvent(TRACK_EVENT_START);
      sessionStorage.setItem(startFlagKey, '1');
    }

    const sendEndOnce = () => {
      if (sessionStorage.getItem(endFlagKey)) return;
      sendEvent(TRACK_EVENT_END);
      sessionStorage.setItem(endFlagKey, '1');
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendEndOnce();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', sendEndOnce);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', sendEndOnce);
    };
  }, []);

  const tsResult = useMemo(() => runSimulation(parameters), [parameters]);
  const logDesmosTiming = (event: string, data: Record<string, unknown> = {}) => {
    if (!desmosTimingEnabled) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsedMs = (now - appStartMsRef.current).toFixed(1);
    console.info(`${DESMOS_TIMING_TAG} +${elapsedMs}ms ${event}`, data);
  };

  useEffect(() => {
    logDesmosTiming('mount-effect', {
      hasDesmosEmbed: Boolean(desmosEmbedUrl),
      visibilityState: document.visibilityState,
      readyState: document.readyState,
      userAgent: navigator.userAgent,
    });
  }, []);

  // Deterministic startup: paint app first, then start Desmos shortly after.
  useEffect(() => {
    if (!desmosEmbedUrl) return;
    const warmupController = new AbortController();
    try {
      const origin = new URL(desmosEmbedUrl).origin;
      const dnsPrefetch = document.createElement('link');
      dnsPrefetch.rel = 'dns-prefetch';
      dnsPrefetch.href = origin;
      document.head.appendChild(dnsPrefetch);
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch {
      /* ignore */
    }
    logDesmosTiming('desmos-warmup:start', { url: desmosEmbedUrl });
    void fetch(desmosEmbedUrl, {
      mode: 'no-cors',
      cache: 'force-cache',
      credentials: 'omit',
      signal: warmupController.signal,
    })
      .then(() => logDesmosTiming('desmos-warmup:done'))
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          logDesmosTiming('desmos-warmup:error', {
            message: err instanceof Error ? err.message : 'unknown',
          });
        }
      });
    let cancelled = false;
    const addIframe = () => {
      if (!cancelled) {
        setDesmosReady(true);
        logDesmosTiming('desmos-ready:set');
      }
    };
    let timeoutId: number | undefined;
    logDesmosTiming('desmos-ready:scheduled', { strategy: 'post-paint-timeout', timeoutMs: DESMOS_BOOT_DELAY_MS });
    const rafId = requestAnimationFrame(() => {
      timeoutId = window.setTimeout(addIframe, DESMOS_BOOT_DELAY_MS);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (timeoutId != null) clearTimeout(timeoutId);
      warmupController.abort();
    };
  }, []);

  useEffect(() => {
    if (!desmosReady) return;
    logDesmosTiming('desmos-ready:committed');
  }, [desmosReady]);

  useEffect(() => {
    if (!desmosLoaded) return;
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : 0) - appStartMsRef.current;
    const minGraphFirstMs = DESMOS_MIN_GRAPH_FIRST_MS;
    const delayMs = Math.max(0, minGraphFirstMs - elapsed);
    logDesmosTiming('desmos-visible:scheduled', {
      elapsedSinceStartMs: Number(elapsed.toFixed(1)),
      minGraphFirstMs,
      delayMs,
      visibilityState: document.visibilityState,
      layerOpacity: desmosLayerRef.current ? getComputedStyle(desmosLayerRef.current).opacity : 'missing-layer',
    });
    const timeoutId = window.setTimeout(() => {
      requestAnimationFrame(() => {
        logDesmosTiming('desmos-visible:raf-1', {
          layerOpacity: desmosLayerRef.current ? getComputedStyle(desmosLayerRef.current).opacity : 'missing-layer',
        });
        requestAnimationFrame(() => {
          logDesmosTiming('desmos-visible:raf-2', {
            layerOpacity: desmosLayerRef.current ? getComputedStyle(desmosLayerRef.current).opacity : 'missing-layer',
          });
          setDesmosVisible(true);
          logDesmosTiming('desmos-visible:set');
        });
      });
    }, delayMs);
    return () => clearTimeout(timeoutId);
  }, [desmosLoaded]);

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
    const controller = new AbortController();
    const url = `${API_BASE_URL.replace(/\/$/, '')}/simulate`;
    setApiLoading(true);
    setApiError(false);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parameters),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: SimulationResult) => {
        setApiResult(data);
        setApiError(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setApiResult(null);
        setApiError(true);
      })
      .finally(() => {
        setApiLoading(false);
        setShowLoadingMessage(false);
      });
    return () => controller.abort();
  }, [usePythonBackend, API_BASE_URL, parameters]);

  const result: SimulationResult =
    usePythonBackend && API_BASE_URL && apiResult != null ? apiResult : tsResult;
  const usingPythonFallback = usePythonBackend && API_BASE_URL && apiError;

  const showRotateOverlay = isMobilePortrait && !rotateHintDismissed && activeTab === 'simulation';

  return (
    <>
      {/* Static SVG background: non-blocking replacement for Desmos */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-center bg-cover bg-no-repeat"
        aria-hidden
        style={{
          backgroundImage: 'url(/alto.png)',
          opacity: isDark ? 0.22 : 0.34,
        }}
      />
      {/* Desmos iframe: sandboxed (forces a separate OS process in Chromium so it can't block the page) */}
      {desmosEmbedUrl && desmosReady && (
        <div
          ref={desmosLayerRef}
          className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
          aria-hidden
          style={{
            contain: 'strict',
            opacity: desmosVisible ? DESMOS_OPACITY : 0,
            willChange: 'opacity',
            transition: 'opacity 1.8s ease-in',
          }}
          onTransitionStart={() => logDesmosTiming('desmos-layer:transition-start')}
          onTransitionEnd={() => logDesmosTiming('desmos-layer:transition-end')}
        >
          <iframe
            ref={(node) => {
              if (node && !desmosIframeMountedRef.current) {
                desmosIframeMountedRef.current = true;
                logDesmosTiming('iframe-mounted', { src: node.src });
              }
            }}
            src={desmosEmbedUrl}
            className="w-full h-full"
            title=""
            loading="eager"
            sandbox="allow-scripts allow-same-origin"
            onLoad={() => {
              logDesmosTiming('iframe-onload', {
                readyState: document.readyState,
                visibilityState: document.visibilityState,
                layerOpacityBeforeSet: desmosLayerRef.current
                  ? getComputedStyle(desmosLayerRef.current).opacity
                  : 'missing-layer',
              });
              setDesmosLoaded(true);
            }}
          />
        </div>
      )}
      <div
        className="relative z-10 h-screen overflow-hidden flex flex-col bg-transparent"
      >
      {showRotateOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Rotate device"
        >
          <div className="w-full max-w-sm rounded-[8px] border border-border bg-card shadow-[0_10px_40px_rgba(0,0,0,0.25)] p-5 animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-[8px] bg-muted flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight">Best in landscape</p>
                <p className="text-xs text-muted-foreground font-medium">
                  Rotate your device to continue.
                </p>
              </div>
            </div>
            <div className="rounded-[6px] border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
              This simulator is designed for a wide layout so the controls and envelope chart stay visible together.
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem(ROTATE_HINT_DISMISS_KEY, '1');
                  } catch {
                    /* ignore */
                  }
                  setRotateHintDismissed(true);
                }}
                className="flex-1 h-10 rounded-[6px] border border-border bg-card text-foreground text-xs font-bold uppercase tracking-wider hover:bg-muted/60 transition-colors"
              >
                Continue anyway
              </button>
              <button
                type="button"
                onClick={() => {
                  // Nudge a reflow; some browsers only update orientation media query after an interaction.
                  window.dispatchEvent(new Event('resize'));
                }}
                className="h-10 px-4 rounded-[6px] bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-95 transition-opacity inline-flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                I rotated
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={`h-14 border-b border-border px-8 flex items-center justify-between ${desmosEmbedUrl ? 'bg-card/90' : 'bg-card/95'} mobile-landscape-compact:!px-4`}>
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
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={usePythonBackend}
                  onChange={(e) => setUsePythonBackend(e.target.checked)}
                  className="rounded border-border"
                />
                Use Python
              </label>
              <button
                type="button"
                onClick={() => {
                  setWelcomeHintClicks((prev) => prev + 1);
                  setShowHintNudge(false);
                }}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ${
                  showHintNudge ? 'animate-pulse text-accent shadow-[0_0_12px_hsl(var(--accent)/0.45)]' : ''
                }`}
                aria-label="Show app hint"
                title="Show app hint"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </div>
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
    <WelcomePopover reopenSignal={welcomeHintClicks} />
    <Analytics />
    </>
  );
}

export default App;
