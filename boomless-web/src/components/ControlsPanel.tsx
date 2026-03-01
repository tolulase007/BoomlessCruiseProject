import { Card } from './ui/Card';
import { Label } from './ui/Label';
import { Slider } from './ui/Slider';
import { Input } from './ui/Input';
import { SimulationParameters, TempMode, KnownTemp, resolveTemps } from '../physics';

interface ControlsPanelProps {
  parameters: SimulationParameters;
  onParametersChange: (params: SimulationParameters) => void;
}

export const ControlsPanel = ({ parameters, onParametersChange }: ControlsPanelProps) => {
  const updateParameter = <K extends keyof SimulationParameters>(key: K, value: SimulationParameters[K]) => {
    onParametersChange({ ...parameters, [key]: value });
  };

  const resolved = resolveTemps(parameters);
  const isTwoTemps = parameters.tempMode === 'twoTemps';

  return (
    <div className="flex flex-col gap-8">
      {/* ── Aircraft Operating Point ───────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-5">
          Aircraft Operating Point
        </h2>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="aircraftAltitude">Aircraft Altitude</Label>
              <span className="text-sm font-bold text-accent">
                {(parameters.aircraftAltitude / 1000).toFixed(1)} km
              </span>
            </div>
            <Slider
              id="aircraftAltitude"
              min={0}
              max={parameters.altitudeMax}
              step={500}
              value={parameters.aircraftAltitude}
              onValueChange={(v) => updateParameter('aircraftAltitude', v)}
            />
          </Card>

          <Card className="p-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="aircraftSpeed">Aircraft Speed</Label>
              <span className="text-sm font-bold text-accent">
                {parameters.aircraftSpeed} m/s
              </span>
            </div>
            <Slider
              id="aircraftSpeed"
              min={parameters.velocityMin}
              max={parameters.velocityMax}
              step={1}
              value={parameters.aircraftSpeed}
              onValueChange={(v) => updateParameter('aircraftSpeed', v)}
            />
          </Card>
        </div>
      </section>

      {/* ── Temperature Mode ───────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-5">
          Temperature Input Mode
        </h2>

        {/* Mode selector */}
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => updateParameter('tempMode', 'twoTemps' as TempMode)}
            className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-[4px] border transition-colors ${
              isTwoTemps
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            Two Temperatures
          </button>
          <button
            onClick={() => updateParameter('tempMode', 'tempAndLapse' as TempMode)}
            className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-[4px] border transition-colors ${
              !isTwoTemps
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            Temp + Lapse Rate
          </button>
        </div>

        <div className="space-y-3">
          {isTwoTemps ? (
            <>
              {/* Ground Temp — editable */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="groundTemp">Ground Temperature</Label>
                  <span className="text-sm font-bold text-accent">
                    {parameters.groundTemp.toFixed(1)}°C
                  </span>
                </div>
                <Slider
                  id="groundTemp"
                  min={-30}
                  max={50}
                  step={0.5}
                  value={parameters.groundTemp}
                  onValueChange={(v) => updateParameter('groundTemp', v)}
                />
              </Card>

              {/* Aircraft Altitude Temp — editable */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="refAltitudeTemp">Altitude Temperature</Label>
                  <span className="text-sm font-bold text-accent">
                    {parameters.refAltitudeTemp.toFixed(1)}°C
                  </span>
                </div>
                <Slider
                  id="refAltitudeTemp"
                  min={-80}
                  max={0}
                  step={0.5}
                  value={parameters.refAltitudeTemp}
                  onValueChange={(v) => updateParameter('refAltitudeTemp', v)}
                />
              </Card>

              {/* Lapse rate — derived, read-only */}
              <div className="px-4 py-3 rounded-[4px] bg-muted/50 border border-border flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Derived Lapse Rate
                </span>
                <span className="text-sm font-bold text-foreground">
                  {resolved.lapseRate.toFixed(2)} °C/km
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Known-temp dropdown */}
              <Card className="p-4">
                <Label htmlFor="knownTemp" className="mb-2 block">Known Temperature</Label>
                <select
                  id="knownTemp"
                  value={parameters.knownTemp}
                  onChange={(e) => updateParameter('knownTemp', e.target.value as KnownTemp)}
                  className="w-full h-10 rounded-[4px] border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ground">Ground Temperature</option>
                  <option value="aircraft">Aircraft Altitude Temperature</option>
                </select>
              </Card>

              {/* The known temperature — editable */}
              {parameters.knownTemp === 'ground' ? (
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="groundTemp2">Ground Temperature</Label>
                    <span className="text-sm font-bold text-accent">
                      {parameters.groundTemp.toFixed(1)}°C
                    </span>
                  </div>
                  <Slider
                    id="groundTemp2"
                    min={-30}
                    max={50}
                    step={0.5}
                    value={parameters.groundTemp}
                    onValueChange={(v) => updateParameter('groundTemp', v)}
                  />
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="refAltitudeTemp2">Altitude Temperature</Label>
                    <span className="text-sm font-bold text-accent">
                      {parameters.refAltitudeTemp.toFixed(1)}°C
                    </span>
                  </div>
                  <Slider
                    id="refAltitudeTemp2"
                    min={-80}
                    max={0}
                    step={0.5}
                    value={parameters.refAltitudeTemp}
                    onValueChange={(v) => updateParameter('refAltitudeTemp', v)}
                  />
                </Card>
              )}

              {/* Lapse Rate — editable */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="lapseRate">Lapse Rate</Label>
                  <span className="text-sm font-bold text-accent">
                    {parameters.lapseRate.toFixed(1)} °C/km
                  </span>
                </div>
                <Slider
                  id="lapseRate"
                  min={2.0}
                  max={12.0}
                  step={0.1}
                  value={parameters.lapseRate}
                  onValueChange={(v) => updateParameter('lapseRate', v)}
                />
              </Card>

              {/* Derived temperature — read-only */}
              <div className="px-4 py-3 rounded-[4px] bg-muted/50 border border-border flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {parameters.knownTemp === 'ground' ? 'Derived Alt Temp' : 'Derived Ground Temp'}
                </span>
                <span className="text-sm font-bold text-foreground">
                  {parameters.knownTemp === 'ground'
                    ? `${resolved.refAltitudeTemp.toFixed(1)}°C`
                    : `${resolved.groundTemp.toFixed(1)}°C`}
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Flight Envelope Bounds ─────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-5">
          Envelope Bounds
        </h2>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="altitudeMax">Max Altitude</Label>
              <span className="text-sm font-bold text-accent">
                {(parameters.altitudeMax / 1000).toFixed(0)} km
              </span>
            </div>
            <Slider
              id="altitudeMax"
              min={5000}
              max={30000}
              step={1000}
              value={parameters.altitudeMax}
              onValueChange={(v) => updateParameter('altitudeMax', v)}
            />
          </Card>

          <Card className="p-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="velocityMin">Min Speed</Label>
              <span className="text-sm font-bold text-accent">
                {parameters.velocityMin} m/s
              </span>
            </div>
            <Slider
              id="velocityMin"
              min={150}
              max={300}
              step={10}
              value={parameters.velocityMin}
              onValueChange={(v) => updateParameter('velocityMin', v)}
            />
          </Card>

          <Card className="p-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="velocityMax">Max Speed</Label>
              <span className="text-sm font-bold text-accent">
                {parameters.velocityMax} m/s
              </span>
            </div>
            <Slider
              id="velocityMax"
              min={350}
              max={500}
              step={10}
              value={parameters.velocityMax}
              onValueChange={(v) => updateParameter('velocityMax', v)}
            />
          </Card>

          <Card className="p-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="refAltitude">Reference Altitude</Label>
              <span className="text-sm font-bold text-accent">
                {(parameters.refAltitude / 1000).toFixed(1)} km
              </span>
            </div>
            <Slider
              id="refAltitude"
              min={5000}
              max={20000}
              step={500}
              value={parameters.refAltitude}
              onValueChange={(v) => updateParameter('refAltitude', v)}
            />
          </Card>
        </div>
      </section>

      {/* ── Gas Properties ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-5">
          Gas Properties
        </h2>
        <div className="space-y-3">
          <Card className="p-4">
            <Label htmlFor="gamma" className="mb-2 block">Adiabatic Index (γ)</Label>
            <Input
              id="gamma"
              type="number"
              step="0.01"
              value={parameters.gamma}
              onChange={(e) => updateParameter('gamma', parseFloat(e.target.value) || 1.4)}
              className="w-full"
            />
          </Card>

          <Card className="p-4">
            <Label htmlFor="R" className="mb-2 block">Gas Constant (R)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="R"
                type="number"
                step="1"
                value={parameters.R}
                onChange={(e) => updateParameter('R', parseFloat(e.target.value) || 287)}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">J/(kg·K)</span>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};
