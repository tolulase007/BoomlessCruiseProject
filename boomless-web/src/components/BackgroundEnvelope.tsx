import { useMemo } from 'react';
import { SimulationResult } from '../physics';

const SVG_W = 800;
const SVG_H = 480;
const MARGIN = { top: 24, right: 24, bottom: 64, left: 72 };
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;

interface BackgroundEnvelopeProps {
  result: SimulationResult;
  opacity?: number;
}

/**
 * Lightweight SVG background of the Mach envelope (c(h) curve + ground line).
 * Renders instantly from simulation data — no iframe or external script.
 */
export function BackgroundEnvelope({ result, opacity = 0.12 }: BackgroundEnvelopeProps) {
  const { pathD, groundLine, fillPoints } = useMemo(() => {
    const vMin = result.velocityArray[0];
    const vMax = result.velocityArray[result.velocityArray.length - 1];
    const hMinKm = result.altitudeArray[0] / 1000;
    const hMaxKm = result.altitudeArray[result.altitudeArray.length - 1] / 1000;
    const vRange = vMax - vMin || 1;
    const hRange = hMaxKm - hMinKm || 1;

    const xScale = (v: number) => ((v - vMin) / vRange) * PLOT_W;
    const yScale = (hKm: number) => PLOT_H - ((hKm - hMinKm) / hRange) * PLOT_H;

    const points: string[] = [];
    for (let i = 0; i < result.altitudeArray.length; i++) {
      const x = xScale(result.localSoundSpeed[i]);
      const y = yScale(result.altitudeArray[i] / 1000);
      points.push(`${x},${y}`);
    }
    const pathD = points.length ? `M ${points.join(' L ')}` : '';

    const cGroundX = xScale(result.groundSoundSpeed);
    const y0 = yScale(hMinKm);
    const y1 = yScale(hMaxKm);
    const groundLine = { x1: cGroundX, y1, x2: cGroundX, y2: y0 };

    const leftBoundary: string[] = [];
    for (let i = 0; i < result.altitudeArray.length; i++) {
      const x = xScale(result.localSoundSpeed[i]);
      const y = yScale(result.altitudeArray[i] / 1000);
      if (x < cGroundX - 0.5) leftBoundary.push(`${x},${y}`);
    }
    const fillPoints =
      leftBoundary.length > 0
        ? `${leftBoundary.join(' ')} ${cGroundX},${leftBoundary[leftBoundary.length - 1].split(',')[1]} ${cGroundX},${leftBoundary[0].split(',')[1]}`
        : '';

    return { pathD, groundLine, fillPoints };
  }, [result]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden
      style={{ contain: 'layout style paint' }}
    >
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ opacity, transition: 'opacity 1.2s ease-out' }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {fillPoints ? (
            <polygon points={fillPoints} fill="rgba(34,197,94,0.08)" stroke="none" />
          ) : null}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeOpacity={0.2}
              strokeDasharray="4 3"
            />
          )}
          <line
            x1={groundLine.x1}
            y1={groundLine.y1}
            x2={groundLine.x2}
            y2={groundLine.y2}
            stroke="currentColor"
            strokeWidth={1}
            strokeOpacity={0.25}
          />
        </g>
      </svg>
    </div>
  );
}
