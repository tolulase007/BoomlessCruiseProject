import { SimulationParameters, SimulationResult } from '../physics';
import { ControlsPanel } from './ControlsPanel';
import { FlightEnvelopeChart } from './FlightEnvelopeChart';

export interface SimulationViewProps {
  parameters: SimulationParameters;
  onParametersChange: (p: SimulationParameters) => void;
  result: SimulationResult;
}

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
    <div className="bg-card border border-border p-3 rounded-[4px] card-lift">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-base font-bold">
        <span className={accent ? 'text-accent' : ''}>{value}</span>
        {unit && (
          <span className="text-xs text-muted-foreground font-normal ml-1">{unit}</span>
        )}
      </p>
    </div>
  );
}

export function SimulationView({
  parameters,
  onParametersChange,
  result,
}: SimulationViewProps) {
  const ap = result.aircraftPoint;

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside
        className="w-[300px] shrink-0 border-r border-border overflow-y-auto scrollbar-hide min-h-0 p-8 bg-muted/50"
      >
        <ControlsPanel parameters={parameters} onParametersChange={onParametersChange} />
      </aside>

      <main
        className="flex-1 p-4 overflow-hidden flex flex-col bg-background/85"
      >
        <div className="flex-1 flex flex-col gap-3 min-h-0 max-w-5xl mx-auto w-full">
          {/* Title row */}
          <div className="flex justify-between items-start shrink-0">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-0.5">Mach Cutoff Envelope</h2>
              <p className="text-muted-foreground text-xs font-medium">
                {parameters.tempMode === 'twoTemps' ? 'Two-temperature' : 'Lapse-rate'}{' '}
                atmospheric model &middot; {parameters.gridResolution}&times;
                {parameters.gridResolution} grid
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

          {/* Chart — grows to fill remaining space */}
          <div className="flex-1 min-h-0">
            <FlightEnvelopeChart result={result} />
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
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
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-muted/50 border border-border p-3 rounded-[4px] text-xs leading-relaxed">
              <span className="font-bold">Boomless condition:</span> Aircraft flies supersonically
              at altitude (M<sub>local</sub>&gt;1) while the ground Mach number stays below 1
              (M<sub>ground</sub>&lt;1). The shock refracts upward before reaching the surface.
            </div>
            <div className="bg-muted/50 border border-border p-3 rounded-[4px] text-xs leading-relaxed">
              <span className="font-bold">Resolved temps:</span> Ground{' '}
              {result.resolvedGroundTemp.toFixed(1)}°C, Altitude{' '}
              {result.resolvedRefAltitudeTemp.toFixed(1)}°C, Lapse rate{' '}
              {result.resolvedLapseRate.toFixed(2)}°C/km
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
