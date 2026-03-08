# First display an introductory message that introduces the project and explains its use.
print("This is the Boomless Cruise Simulation Project")
print("This tool allows you to determine whether an aircraft in supersonic flight will have a sonic boom audible on the ground")
print("To use, type in relevant parameters if known")
# Users can leave fields blank if they don't know the value, and a default value is used.
print("If value is not known, press enter to use a default value instead")

aircraft_altitude = input("Please enter the altitude (above sea level) of the aircraft in meters: ")
if aircraft_altitude == "":
    aircraft_altitude = 10000
aircraft_altitude = float(aircraft_altitude)

print("Altitude lapse rate will only be used to estimate the other temperature value if only one is given.")
print("If value is not known, press enter to use a default value instead")
altitude_lapse_rate = input("Please enter the altitude lapse rate in degrees C per kilometer: ")
if altitude_lapse_rate == "":
    altitude_lapse_rate = 6.5
altitude_lapse_rate = float(altitude_lapse_rate)

land_temperature = input("Please enter the temperature according to local weather data close to ground in degrees C: ")
if land_temperature == "":
    land_temperature = 0
land_temperature = float(land_temperature)

aircraft_temperature = input("Please enter the temperature of the air at the aircraft altitude in degrees C: ")
if aircraft_temperature == "":
    aircraft_temperature = -55
aircraft_temperature = float(aircraft_temperature)

aircraft_speed = input("Please enter the flight speed of the aircraft in meters per second: ")
if aircraft_speed == "":
    aircraft_speed = 350
aircraft_speed = float(aircraft_speed)

adiabatic_index = input("Please enter the adiabatic index: | Leave blank if you don't know it: ")
if adiabatic_index == "":
    adiabatic_index = 1.4
adiabatic_index = float(adiabatic_index)

specific_gas_constant = input("Please enter the value for the specific gas constant of air: ")
if specific_gas_constant == "":
    specific_gas_constant = 287
specific_gas_constant = float(specific_gas_constant)

# Build params dict matching TS SimulationParameters (two-temps mode, same grid as original)
params = {
    "altitudeMin": 0,
    "altitudeMax": 20000,
    "velocityMin": 250,
    "velocityMax": 380,
    "lapseRate": altitude_lapse_rate,
    "groundTemp": land_temperature,
    "refAltitudeTemp": aircraft_temperature,
    "groundElevation": 0,
    "tempMode": "twoTemps",
    "knownTemp": "ground",
    "gamma": adiabatic_index,
    "R": specific_gas_constant,
    "aircraftSpeed": aircraft_speed,
    "aircraftAltitude": aircraft_altitude,
    "gridResolution": 400,
}

from boomless_physics import run_simulation

result = run_simulation(params)
ap = result["aircraftPoint"]

if ap["speed"] > ap["localSoundSpeed"] and ap["speed"] < ap["groundSoundSpeed"]:
    print("The aircraft speed is between the speed of sound on the ground and the speed of sound at the aircraft's altitude.")
if ap["groundMach"] < 1:
    print("The given flight conditions satisfy mach cutoff, there should be no audible sonic boom")
if ap["localMach"] > 1:
    print("The aircraft is locally supersonic")

# Optional matplotlib plot using returned arrays
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

altitude = np.array(result["altitudeArray"])
velocity = np.array(result["velocityArray"])
local_c = np.array(result["localSoundSpeed"])
c_ground = result["groundSoundSpeed"]

V, H = np.meshgrid(velocity, altitude)
# c(h) at each grid point: for each row (fixed h), local_c[i] is constant
c_altitude = np.broadcast_to(local_c[:, np.newaxis], V.shape)
boomless = (V > c_altitude) & (V < c_ground)
subsonic = (V < c_altitude) & (~boomless)

plt.figure(figsize=(8, 6))
plt.contourf(V, H / 1000, boomless, levels=[0, 0.5, 1], alpha=0.9)
plt.contourf(V, H / 1000, np.where(subsonic, 1, np.nan), levels=[0.5, 1.5], colors=["lightgrey"])
plt.plot(local_c, altitude / 1000, linestyle="--", label="c(h)")
legend_elements = [
    Patch(facecolor="lime", edgecolor="k", label="Feasible (boomless) region"),
    Patch(facecolor="lightgrey", edgecolor="k", label="Subsonic region (V < c(h))"),
]
plt.axvline(c_ground, linestyle="-", label="c at ground")
plt.xlabel("Aircraft speed V (m/s)")
plt.ylabel("Altitude (km)")
plt.title("Boomless Cruise Feasible Region (Mach Cutoff)")
plt.legend(handles=legend_elements)
plt.grid(True)
plt.show()
