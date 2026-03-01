import { useState, useMemo, useEffect, useRef } from 'react';
import { SimulationParameters, defaultParameters, runSimulation, SimulationResult } from './physics';
import { ControlsPanel } from './components/ControlsPanel';
import { FlightEnvelopeChart } from './components/FlightEnvelopeChart';
import { DarkModeToggle } from './components/DarkModeToggle';
import { Plane } from 'lucide-react';
import { DESMOS_GRAPH_URL, DESMOS_OPACITY, API_BASE_URL, PYTHON_FIDDLE_URL } from './config';

const desmosEmbedUrl = DESMOS_GRAPH_URL
  ? `${DESMOS_GRAPH_URL.replace(/\?.*$/, '')}?embed`
  : '';

function App() {
  const [parameters, setParameters] = useState<SimulationParameters>(defaultParameters);
  const [usePythonBackend, setUsePythonBackend] = useState(false);
  const [apiResult, setApiResult] = useState<SimulationResult | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);
  const prevUsePythonBackend = useRef(false);
  const [activeTab, setActiveTab] = useState<'simulation' | 'tryScript'>('simulation');

  const tsResult = useMemo(() => runSimulation(parameters), [parameters]);

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
  const ap = result.aircraftPoint;
  const usingPythonFallback = usePythonBackend && API_BASE_URL && apiError;

  return (
    <>
      {desmosEmbedUrl && (
        <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <iframe
            src={desmosEmbedUrl}
            className="w-full h-full pointer-events-none"
            style={{ opacity: DESMOS_OPACITY }}
            title=""
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
          <DarkModeToggle />
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      {activeTab === 'simulation' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className={`w-[300px] border-r border-border overflow-y-auto p-8 flex flex-col ${desmosEmbedUrl ? 'bg-muted/50' : 'bg-muted/30'}`}>
            <ControlsPanel parameters={parameters} onParametersChange={setParameters} />
          </aside>

          {/* Main content */}
          <main className={`flex-1 p-8 overflow-y-auto ${desmosEmbedUrl ? 'bg-background/85' : 'bg-background'}`}>
            <div className="max-w-5xl mx-auto flex flex-col gap-8">
              {/* Title row */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold tracking-tight mb-1">Mach Cutoff Envelope</h2>
                  <p className="text-muted-foreground text-xs font-medium">
                    {parameters.tempMode === 'twoTemps' ? 'Two-temperature' : 'Lapse-rate'} atmospheric model
                    &middot; {parameters.gridResolution}&times;{parameters.gridResolution} grid
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Flight Condition
                  </span>
                  <div
                    className={`px-3 py-1 rounded-[4px] text-[10px] font-bold tracking-widest flex items-center gap-2 ${
                      ap.isBoomless
                        ? 'bg-emerald-600 text-white'
                        : ap.localMach < 1
                        ? 'bg-gray-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {ap.isBoomless ? 'BOOMLESS' : ap.localMach < 1 ? 'SUBSONIC' : 'AUDIBLE BOOM'}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <FlightEnvelopeChart result={result} />

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-5">
                <MetricCard
                  label="Ground Speed of Sound"
                  value={`${result.groundSoundSpeed.toFixed(1)}`}
                  unit="m/s"
                />
                <MetricCard
                  label="Local Speed of Sound"
                  value={`${ap.localSoundSpeed.toFixed(1)}`}
                  unit="m/s"
                />
                <MetricCard
                  label="Ground Mach"
                  value={ap.groundMach.toFixed(3)}
                  accent={ap.groundMach < 1}
                />
                <MetricCard
                  label="Local Mach"
                  value={ap.localMach.toFixed(3)}
                  accent={ap.localMach > 1}
                />
              </div>

              {/* Info row */}
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-muted/50 border border-border p-4 rounded-[4px] text-sm leading-relaxed">
                  <span className="font-bold">Boomless condition:</span>{' '}
                  Aircraft flies supersonically at altitude (M<sub>local</sub>&gt;1) while the ground
                  Mach number stays below 1 (M<sub>ground</sub>&lt;1). The shock refracts upward
                  before reaching the surface.
                </div>
                <div className="bg-muted/50 border border-border p-4 rounded-[4px] text-sm leading-relaxed">
                  <span className="font-bold">Resolved temps:</span>{' '}
                  Ground {result.resolvedGroundTemp.toFixed(1)}°C,{' '}
                  Altitude {result.resolvedRefAltitudeTemp.toFixed(1)}°C,{' '}
                  Lapse rate {result.resolvedLapseRate.toFixed(2)}°C/km
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {activeTab === 'tryScript' && PYTHON_FIDDLE_URL && (
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-xs text-muted-foreground px-4 py-2 border-b border-border bg-muted/30">
            Click Run All when ready.
          </p>
          <iframe
            src={PYTHON_FIDDLE_URL}
            title="Run Boomless Cruise script in Python"
            className="w-full border-0 flex-1 min-h-0"
            style={{ height: 'calc(100vh - 3.5rem)' }}
          />
        </div>
      )}
    </div>
    </>
  );
}

// ── Small metric card ──────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-border p-4 rounded-[4px] card-lift">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className="text-lg font-bold">
        <span className={accent ? 'text-accent' : ''}>{value}</span>
        {unit && (
          <span className="text-xs text-muted-foreground font-normal ml-1">{unit}</span>
        )}
      </p>
    </div>
  );
}

export default App;
