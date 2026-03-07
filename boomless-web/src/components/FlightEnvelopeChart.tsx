import { useMemo, useState, useCallback, memo } from 'react';
import { SimulationResult } from '../physics';
import { Card } from './ui/Card';

interface FlightEnvelopeChartProps {
  result: SimulationResult;
}

// ── Layout constants ───────────────────────────────────────────────────

const MARGIN = { top: 24, right: 24, bottom: 64, left: 72 };
const SVG_W = 800;
const SVG_H = 480;
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;

// ── Helpers ────────────────────────────────────────────────────────────

function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  let nice: number;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 7) nice = 5;
  else nice = 10;
  return nice * pow;
}

function generateTicks(min: number, max: number, targetTicks: number): number[] {
  const step = niceStep(max - min, targetTicks);
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) {
    ticks.push(parseFloat(v.toPrecision(10)));
  }
  return ticks;
}

// ── Component ──────────────────────────────────────────────────────────

export const FlightEnvelopeChart = memo(function FlightEnvelopeChart({ result }: FlightEnvelopeChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  });

  // Domain
  const vMin = result.velocityArray[0];
  const vMax = result.velocityArray[result.velocityArray.length - 1];
  const hMin = result.altitudeArray[0];
  const hMax = result.altitudeArray[result.altitudeArray.length - 1];
  const hMinKm = hMin / 1000;
  const hMaxKm = hMax / 1000;

  // Scale functions — round to 1 decimal to reduce SVG string size
  const xScale = useCallback((v: number) => Math.round(((v - vMin) / (vMax - vMin)) * PLOT_W * 10) / 10, [vMin, vMax]);
  const yScale = useCallback(
    (hKm: number) => Math.round((PLOT_H - ((hKm - hMinKm) / (hMaxKm - hMinKm)) * PLOT_H) * 10) / 10,
    [hMinKm, hMaxKm],
  );

  // Ticks
  const xTicks = useMemo(() => generateTicks(vMin, vMax, 8), [vMin, vMax]);
  const yTicks = useMemo(() => generateTicks(hMinKm, hMaxKm, 6), [hMinKm, hMaxKm]);

  // c(h) curve points  —  altitude on Y (km), speed on X (m/s)
  const cCurvePoints = useMemo(() => {
    return result.altitudeArray.map((h, i) => ({
      x: xScale(result.localSoundSpeed[i]),
      y: yScale(h / 1000),
    }));
  }, [result, xScale, yScale]);

  // c_ground vertical line x position
  const cGroundX = useMemo(() => Math.round(xScale(result.groundSoundSpeed) * 10) / 10, [result.groundSoundSpeed, xScale]);

  // ── Regions as SVG polygon point strings ──

  // Boomless zone: between c(h) curve (left) and c_ground line (right)
  const boomlessPoints = useMemo(() => {
    // Collect valid points where c(h) < c_ground
    const valid = cCurvePoints.filter((p) => p.x < cGroundX - 0.5);
    if (valid.length === 0) return '';

    const pts: string[] = [];
    // Left boundary: walk c(h) from bottom to top
    for (const p of valid) {
      pts.push(`${p.x},${p.y}`);
    }
    // Right boundary: c_ground from top back to bottom
    pts.push(`${cGroundX},${valid[valid.length - 1].y}`);
    pts.push(`${cGroundX},${valid[0].y}`);
    return pts.join(' ');
  }, [cCurvePoints, cGroundX]);

  // Subsonic zone: left of c(h) curve
  const subsonicPoints = useMemo(() => {
    const pts: string[] = [];
    // Top-left corner of plot
    pts.push(`0,0`);
    // Walk c(h) from top to bottom (reverse index order)
    for (let i = cCurvePoints.length - 1; i >= 0; i--) {
      pts.push(`${cCurvePoints[i].x},${cCurvePoints[i].y}`);
    }
    // Bottom-left corner of plot
    pts.push(`0,${PLOT_H}`);
    return pts.join(' ');
  }, [cCurvePoints]);

  // ── Aircraft dot ──
  const dot = useMemo(() => {
    const ap = result.aircraftPoint;
    const x = xScale(ap.speed);
    const y = yScale(ap.altitude / 1000);
    const inBounds =
      ap.speed >= vMin && ap.speed <= vMax && ap.altitude >= hMin && ap.altitude <= hMax;
    const isSubsonic = ap.localMach < 1;
    return { x, y, inBounds, isBoomless: ap.isBoomless, isSubsonic };
  }, [result.aircraftPoint, xScale, yScale, vMin, vMax, hMin, hMax]);

  // Mach labels (secondary) for x-axis ticks — based on local c at aircraft altitude
  const cLocal = result.aircraftPoint.localSoundSpeed;

  // ── Tooltip handlers ──
  const handleDotEnter = () => setTooltip({ x: dot.x, y: dot.y, show: true });
  const handleDotLeave = () => setTooltip((t) => ({ ...t, show: false }));

  const ap = result.aircraftPoint;

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Legend header — card-style for trading UI feel */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-6 bg-card">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(34,197,94,0.35)' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Boomless Zone
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(156,163,175,0.25)' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Subsonic
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-0.5 border-t-2 border-dashed border-accent" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            c(h) Boundary
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-0.5 bg-destructive" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            c at Ground
          </span>
        </div>
      </div>

      {/* SVG chart */}
      <div className="flex-1 min-h-0 p-2">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ fontFamily: 'inherit' }}
        >
          <defs>
            <clipPath id="plotClip">
              <rect x={0} y={0} width={PLOT_W} height={PLOT_H} />
            </clipPath>
            <linearGradient id="boomlessGradient" x1="0" x2="0" y1="1" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(34,197,94,0.12)" />
              <stop offset="100%" stopColor="rgba(34,197,94,0.28)" />
            </linearGradient>
          </defs>
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* Plot area background — CoinGecko-style subtle fill */}
            <rect x={0} y={0} width={PLOT_W} height={PLOT_H} className="chart-plot-bg" />

            {/* Grid lines — light, thin */}
            {xTicks.map((v) => (
              <line
                key={`gx-${v}`}
                x1={xScale(v)}
                x2={xScale(v)}
                y1={0}
                y2={PLOT_H}
                className="chart-grid-line"
              />
            ))}
            {yTicks.map((hk) => (
              <line
                key={`gy-${hk}`}
                x1={0}
                x2={PLOT_W}
                y1={yScale(hk)}
                y2={yScale(hk)}
                className="chart-grid-line"
              />
            ))}

            {/* Subsonic fill — more transparent */}
            <polygon
              points={subsonicPoints}
              fill="rgba(156,163,175,0.12)"
              clipPath="url(#plotClip)"
            />

            {/* Boomless fill — subtle gradient */}
            {boomlessPoints && (
              <polygon
                points={boomlessPoints}
                fill="url(#boomlessGradient)"
                clipPath="url(#plotClip)"
              />
            )}

            {/* c(h) dashed curve — theme accent */}
            <polyline
              points={cCurvePoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              className="stroke-accent"
              strokeWidth={2}
              strokeDasharray="6 4"
              clipPath="url(#plotClip)"
            />

            {/* c_ground vertical line */}
            <line
              x1={cGroundX}
              x2={cGroundX}
              y1={0}
              y2={PLOT_H}
              className="stroke-destructive"
              strokeWidth={2}
            />

            {/* Plot border — subtle axis */}
            <rect
              x={0}
              y={0}
              width={PLOT_W}
              height={PLOT_H}
              fill="none"
              className="stroke-foreground"
              strokeWidth={1}
              strokeOpacity={0.15}
            />

            {/* Aircraft dot */}
            {dot.inBounds && (
              <g
                onMouseEnter={handleDotEnter}
                onMouseLeave={handleDotLeave}
                style={{ cursor: 'pointer' }}
              >
                {/* outer ring */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={8}
                  fill={
                    dot.isSubsonic
                      ? 'rgba(107,114,128,0.2)'
                      : dot.isBoomless
                      ? 'rgba(34,197,94,0.2)'
                      : 'rgba(239,68,68,0.2)'
                  }
                  stroke={
                    dot.isSubsonic
                      ? 'rgb(107,114,128)'
                      : dot.isBoomless
                      ? 'rgb(34,197,94)'
                      : 'rgb(239,68,68)'
                  }
                  strokeWidth={1.5}
                />
                {/* inner dot */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={4}
                  fill={
                    dot.isSubsonic
                      ? 'rgb(107,114,128)'
                      : dot.isBoomless
                      ? 'rgb(34,197,94)'
                      : 'rgb(239,68,68)'
                  }
                />
                {/* label */}
                <text
                  x={dot.x + 14}
                  y={dot.y + 4}
                  fontSize={10}
                  fontWeight={700}
                  fill={
                    dot.isSubsonic
                      ? 'rgb(107,114,128)'
                      : dot.isBoomless
                      ? 'rgb(34,197,94)'
                      : 'rgb(239,68,68)'
                  }
                >
                  {dot.isSubsonic ? 'SUBSONIC' : dot.isBoomless ? 'BOOMLESS' : 'AUDIBLE BOOM'}
                </text>
              </g>
            )}

            {/* Tooltip — border and shadow */}
            {tooltip.show && dot.inBounds && (
              <g className="chart-tooltip">
                <rect
                  x={tooltip.x + 18}
                  y={tooltip.y - 52}
                  width={170}
                  height={48}
                  rx={4}
                  className="fill-card stroke-border"
                  strokeWidth={1}
                />
                <text x={tooltip.x + 26} y={tooltip.y - 35} fontSize={10} className="fill-foreground font-medium">
                  {`Speed: ${ap.speed} m/s  (M ${ap.groundMach.toFixed(2)})`}
                </text>
                <text x={tooltip.x + 26} y={tooltip.y - 20} fontSize={10} className="fill-foreground font-medium">
                  {`Alt: ${(ap.altitude / 1000).toFixed(1)} km  Local M ${ap.localMach.toFixed(2)}`}
                </text>
              </g>
            )}

            {/* X-axis ticks + labels */}
            {xTicks.map((v) => {
              const x = xScale(v);
              const mach = v / cLocal;
              return (
                <g key={`xt-${v}`}>
                  <line x1={x} x2={x} y1={PLOT_H} y2={PLOT_H + 5} className="stroke-foreground" strokeOpacity={0.5} />
                  <text x={x} y={PLOT_H + 18} textAnchor="middle" fontSize={11} className="fill-foreground" fontWeight={500}>
                    {v}
                  </text>
                  <text x={x} y={PLOT_H + 30} textAnchor="middle" fontSize={9} className="fill-muted-foreground">
                    {`M ${mach.toFixed(2)}`}
                  </text>
                </g>
              );
            })}

            {/* X-axis title */}
            <text
              x={PLOT_W / 2}
              y={PLOT_H + 50}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              className="fill-foreground"
            >
              Aircraft Speed (m/s)
            </text>

            {/* Y-axis ticks + labels */}
            {yTicks.map((hk) => {
              const y = yScale(hk);
              return (
                <g key={`yt-${hk}`}>
                  <line x1={-5} x2={0} y1={y} y2={y} className="stroke-foreground" strokeOpacity={0.5} />
                  <text x={-10} y={y + 4} textAnchor="end" fontSize={11} className="fill-foreground" fontWeight={500}>
                    {hk}
                  </text>
                </g>
              );
            })}

            {/* Y-axis title */}
            <text
              x={0}
              y={0}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              className="fill-foreground"
              transform={`translate(-50,${PLOT_H / 2}) rotate(-90)`}
            >
              Altitude (km)
            </text>
          </g>
        </svg>
      </div>
    </Card>
  );
});
