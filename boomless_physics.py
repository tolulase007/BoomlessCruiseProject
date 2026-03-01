"""
Boomless Cruise Simulation — core physics.
Single source of truth: resolve_temps and run_simulation.
Returns JSON-serializable dicts matching the TS SimulationParameters / SimulationResult contract.
"""

import numpy as np


def resolve_temps(params: dict) -> dict:
    """
    Mirror TS behavior: resolve groundTemp, refAltitudeTemp, lapseRate (all °C)
    from tempMode and knownTemp.
    """
    h_ref_km = params["refAltitude"] / 1000.0
    temp_mode = params.get("tempMode", "twoTemps")
    known_temp = params.get("knownTemp", "ground")

    if temp_mode == "twoTemps":
        # Both temperatures are inputs → derive lapse rate
        lapse_rate = (
            (params["groundTemp"] - params["refAltitudeTemp"]) / h_ref_km
            if h_ref_km > 0
            else params["lapseRate"]
        )
        return {
            "groundTemp": params["groundTemp"],
            "refAltitudeTemp": params["refAltitudeTemp"],
            "lapseRate": float(lapse_rate),
        }

    # tempAndLapse mode
    if known_temp == "ground":
        ref_altitude_temp = params["groundTemp"] - params["lapseRate"] * h_ref_km
        return {
            "groundTemp": params["groundTemp"],
            "refAltitudeTemp": float(ref_altitude_temp),
            "lapseRate": params["lapseRate"],
        }

    # knownTemp === 'aircraft'
    ground_temp = params["refAltitudeTemp"] + params["lapseRate"] * h_ref_km
    return {
        "groundTemp": float(ground_temp),
        "refAltitudeTemp": params["refAltitudeTemp"],
        "lapseRate": params["lapseRate"],
    }


def _temperature(h: np.ndarray, T_ground_K: float, lapse_rate_per_m: float) -> np.ndarray:
    """T(h) = T_ground_K - lapse_rate_per_m * h (Kelvin)."""
    return np.maximum(T_ground_K - lapse_rate_per_m * h, 1.0)  # clamp to avoid NaN


def _speed_of_sound(T: np.ndarray, gamma: float, R: float) -> np.ndarray:
    """c = sqrt(gamma * R * T)."""
    return np.sqrt(gamma * R * T)


def run_simulation(params: dict) -> dict:
    """
    Run the boomless cruise simulation. Accepts a dict with the same keys as TS
    SimulationParameters; returns a dict matching TS SimulationResult (all
    values JSON-serializable: lists and floats, no numpy types).
    """
    resolved = resolve_temps(params)
    T_ground_K = resolved["groundTemp"] + 273.15
    lapse_rate_per_m = resolved["lapseRate"] / 1000.0  # K/m
    gamma = params["gamma"]
    R = params["R"]
    resolution = int(params["gridResolution"])

    # 1-D arrays
    altitude_arr = np.linspace(
        params["altitudeMin"], params["altitudeMax"], resolution, dtype=float
    )
    velocity_arr = np.linspace(
        params["velocityMin"], params["velocityMax"], resolution, dtype=float
    )

    # Ground sound speed
    T_ground = _temperature(np.array([0.0]), T_ground_K, lapse_rate_per_m)[0]
    c_ground = float(_speed_of_sound(np.array([T_ground]), gamma, R)[0])

    # c(h) boundary curve
    T_at_alt = _temperature(altitude_arr, T_ground_K, lapse_rate_per_m)
    local_sound_speed = _speed_of_sound(T_at_alt, gamma, R)

    # Aircraft operating point
    T_aircraft = _temperature(
        np.array([params["aircraftAltitude"]]), T_ground_K, lapse_rate_per_m
    )[0]
    c_aircraft = float(_speed_of_sound(np.array([T_aircraft]), gamma, R)[0])
    local_mach = params["aircraftSpeed"] / c_aircraft
    ground_mach = params["aircraftSpeed"] / c_ground
    is_boomless = ground_mach < 1 and local_mach > 1

    aircraft_point = {
        "speed": params["aircraftSpeed"],
        "altitude": params["aircraftAltitude"],
        "localSoundSpeed": c_aircraft,
        "groundSoundSpeed": c_ground,
        "localMach": float(local_mach),
        "groundMach": float(ground_mach),
        "isBoomless": is_boomless,
    }

    return {
        "altitudeArray": altitude_arr.tolist(),
        "velocityArray": velocity_arr.tolist(),
        "localSoundSpeed": local_sound_speed.tolist(),
        "groundSoundSpeed": c_ground,
        "aircraftPoint": aircraft_point,
        "resolvedGroundTemp": resolved["groundTemp"],
        "resolvedRefAltitudeTemp": resolved["refAltitudeTemp"],
        "resolvedLapseRate": resolved["lapseRate"],
    }
