/**
 * Physics Engine for Boomless Cruise Simulation
 * Port of Python NumPy logic to TypeScript
 *
 * Temperature model:
 *   T(h) = T_ground_K - lapseRate_per_m * h
 *
 * In "Two Temperatures" mode the lapse rate is derived from the two anchor
 * temps so both T(0) and T(h_ref) are exact.  In "Temp + Lapse Rate" mode
 * one temperature is the input and the other is derived.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type TempMode = 'twoTemps' | 'tempAndLapse';
export type KnownTemp = 'ground' | 'aircraft';

export interface SimulationParameters {
  // Grid bounds
  altitudeMin: number;   // meters
  altitudeMax: number;   // meters
  velocityMin: number;   // m/s
  velocityMax: number;   // m/s

  // Atmospheric parameters
  lapseRate: number;           // °C per km
  groundTemp: number;          // °C
  refAltitudeTemp: number;     // °C at aircraft altitude
  groundElevation: number;     // meters above sea level

  // Temperature input mode
  tempMode: TempMode;
  knownTemp: KnownTemp;        // only used when tempMode === 'tempAndLapse'

  // Gas constants
  gamma: number;   // adiabatic index
  R: number;       // specific gas constant J/(kg·K)

  // Aircraft operating point
  aircraftSpeed: number;      // m/s
  aircraftAltitude: number;   // meters

  // Grid resolution
  gridResolution: number;
}

export interface AircraftPoint {
  speed: number;
  altitude: number;
  localSoundSpeed: number;
  groundSoundSpeed: number;
  localMach: number;
  groundMach: number;
  isBoomless: boolean;
}

export interface SimulationResult {
  // 1-D arrays used by the chart
  altitudeArray: number[];     // meters
  velocityArray: number[];     // m/s

  // Boundary curves
  localSoundSpeed: number[];   // c(h) for each altitude value
  groundSoundSpeed: number;    // constant c at h = 0

  // Aircraft operating point classification
  aircraftPoint: AircraftPoint;

  // Resolved parameters (may differ from inputs due to derivation)
  resolvedGroundTemp: number;        // °C
  resolvedRefAltitudeTemp: number;   // °C
  resolvedLapseRate: number;         // °C / km
}

// ── Resolve temperature parameters ─────────────────────────────────────

export interface ResolvedTemps {
  groundTemp: number;        // °C
  refAltitudeTemp: number;   // °C
  lapseRate: number;         // °C / km
}

/**
 * Given the raw UI parameters, resolve the three temperature values so
 * they are mutually consistent. The mode determines which are inputs and
 * which is derived.
 */
export function resolveTemps(params: SimulationParameters): ResolvedTemps {
  const hRefKm = Math.max(0, params.aircraftAltitude - params.groundElevation) / 1000;

  if (params.tempMode === 'twoTemps') {
    // Both temperatures are inputs → derive lapse rate
    const lapseRate = hRefKm > 0
      ? (params.groundTemp - params.refAltitudeTemp) / hRefKm
      : params.lapseRate;
    return {
      groundTemp: params.groundTemp,
      refAltitudeTemp: params.refAltitudeTemp,
      lapseRate,
    };
  }

  // tempAndLapse mode
  if (params.knownTemp === 'ground') {
    const refAltitudeTemp = params.groundTemp - params.lapseRate * hRefKm;
    return {
      groundTemp: params.groundTemp,
      refAltitudeTemp,
      lapseRate: params.lapseRate,
    };
  }

  // knownTemp === 'aircraft'
  const groundTemp = params.refAltitudeTemp + params.lapseRate * hRefKm;
  return {
    groundTemp,
    refAltitudeTemp: params.refAltitudeTemp,
    lapseRate: params.lapseRate,
  };
}

// ── Core physics ───────────────────────────────────────────────────────

/**
 * Temperature at altitude above local ground h_agl (meters).
 * T(h_agl) = T_ground_K − lapseRate_per_m × h_agl
 */
function temperature(h_agl: number, T_ground_K: number, lapseRate_per_m: number): number {
  return T_ground_K - lapseRate_per_m * h_agl;
}

function altitudeAboveGround(h_asl: number, groundElevation: number): number {
  return Math.max(0, h_asl - groundElevation);
}

/** Speed of sound: c = √(γ R T) */
function speedOfSound(T_kelvin: number, gamma: number, R: number): number {
  return Math.sqrt(gamma * R * Math.max(T_kelvin, 1)); // clamp to avoid NaN
}

// ── Utilities ──────────────────────────────────────────────────────────

function linspace(start: number, stop: number, num: number): number[] {
  const arr: number[] = new Array(num);
  const step = (stop - start) / (num - 1);
  for (let i = 0; i < num; i++) {
    arr[i] = start + step * i;
  }
  return arr;
}

// ── Main simulation ────────────────────────────────────────────────────

export function runSimulation(params: SimulationParameters): SimulationResult {
  const resolution = params.gridResolution;

  // Resolve temperature parameters
  const resolved = resolveTemps(params);
  const T_ground_K = resolved.groundTemp + 273.15;
  const lapseRate_per_m = resolved.lapseRate / 1000; // K/m

  // 1-D arrays
  const altitudeArray = linspace(params.altitudeMin, params.altitudeMax, resolution);
  const velocityArray = linspace(params.velocityMin, params.velocityMax, resolution);

  // Ground sound speed
  const T_ground = temperature(0, T_ground_K, lapseRate_per_m);
  const c_ground = speedOfSound(T_ground, params.gamma, params.R);

  // c(h) boundary curve
  const localSoundSpeed: number[] = new Array(resolution);
  for (let i = 0; i < resolution; i++) {
    const h_agl = altitudeAboveGround(altitudeArray[i], params.groundElevation);
    const T = temperature(h_agl, T_ground_K, lapseRate_per_m);
    localSoundSpeed[i] = speedOfSound(T, params.gamma, params.R);
  }

  // Aircraft operating point
  const aircraftHeightAgl = altitudeAboveGround(params.aircraftAltitude, params.groundElevation);
  const T_aircraft = temperature(aircraftHeightAgl, T_ground_K, lapseRate_per_m);
  const c_aircraft = speedOfSound(T_aircraft, params.gamma, params.R);
  const localMach = params.aircraftSpeed / c_aircraft;
  const groundMach = params.aircraftSpeed / c_ground;

  const aircraftPoint: AircraftPoint = {
    speed: params.aircraftSpeed,
    altitude: params.aircraftAltitude,
    localSoundSpeed: c_aircraft,
    groundSoundSpeed: c_ground,
    localMach,
    groundMach,
    isBoomless: groundMach < 1 && localMach > 1,
  };

  return {
    altitudeArray,
    velocityArray,
    localSoundSpeed,
    groundSoundSpeed: c_ground,
    aircraftPoint,
    resolvedGroundTemp: resolved.groundTemp,
    resolvedRefAltitudeTemp: resolved.refAltitudeTemp,
    resolvedLapseRate: resolved.lapseRate,
  };
}

// ── Defaults ───────────────────────────────────────────────────────────

export const defaultParameters: SimulationParameters = {
  altitudeMin: 0,
  altitudeMax: 20000,
  velocityMin: 250,
  velocityMax: 380,

  lapseRate: 6.5,
  groundTemp: 0,
  refAltitudeTemp: -55,
  groundElevation: 0,

  tempMode: 'twoTemps',
  knownTemp: 'ground',

  gamma: 1.4,
  R: 287,

  aircraftSpeed: 350,
  aircraftAltitude: 10000,

  gridResolution: 400,
};
