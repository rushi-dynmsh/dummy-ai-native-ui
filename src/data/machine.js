// Facts of the real simulator machine (gateway-config/machines/plant-a/hydraulic-rig-01.json)
// and of two illustrative machines that only exist in this prototype.
// Healthy ranges follow the simulator's healthy dataset (MachineMedIQ/mediq-replay/data).

export const SITE = { code: "plant-a", name: "Plant A", timezone: "Europe/Berlin" };

const sensor = (tag, slot, name, unit, component, mean, spread, alarmPrefix = null) => ({
  tag, slot, name, unit, component, healthy: { mean, spread }, alarmPrefix,
});

const alarm = (name, message, priority, component, kind, limit, slot) => ({
  name, message, priority, component, kind, limit, slot, hysteresis: 1.0, onDelayS: 3,
});

const RIG = {
  code: "hydraulic-rig-01",
  name: "Hydraulic Rig 01",
  area: { code: "hydraulics", name: "Hydraulics" },
  line: { code: "hpu-bay-4", name: "HPU bay 4" },
  cell: { code: "test-rig-1", name: "Test rig 1" },
  assetType: { name: "HydraulicPowerUnit", version: "1.2.0" },
  illustrative: false,
  flowSlot: "flow.working",
  components: [
    { code: "main_pump", name: "Main pump", kind: "Pump", criticality: "high" },
    { code: "cooler", name: "Cooler", kind: "HeatExchanger", criticality: "medium" },
    { code: "reservoir", name: "Reservoir", kind: "Reservoir", criticality: "low" },
  ],
  sensors: [
    sensor(1, "pressure.supply", "Supply pressure", "bar", "main_pump", 160, 10),
    sensor(2, "pressure.valve_downstream", "Valve downstream pressure", "bar", "main_pump", 110, 8),
    sensor(3, "pressure.throttle", "Throttle pressure", "bar", "main_pump", 1.8, 0.3),
    sensor(4, "pressure.cooling_a", "Cooling pressure A", "bar", "cooler", 10.0, 0.08, "PS5"),
    sensor(5, "pressure.cooling_b", "Cooling pressure B", "bar", "cooler", 9.9, 0.08, "PS6"),
    sensor(6, "power.motor_input", "Motor power", "W", "main_pump", 2500, 60),
    sensor(7, "flow.working", "Working flow", "l/min", "main_pump", 8.0, 0.5),
    sensor(8, "flow.cooling", "Cooling flow", "l/min", "cooler", 10.6, 0.12, "FS2"),
    sensor(9, "temperature.oil_a", "Oil temperature A", "°C", "reservoir", 36.0, 0.6, "TS1"),
    sensor(10, "temperature.oil_b", "Oil temperature B", "°C", "reservoir", 42.0, 0.6, "TS2"),
    sensor(11, "temperature.cooler_inlet", "Cooler inlet temperature", "°C", "cooler", 38.5, 0.5, "TS3"),
    sensor(12, "temperature.cooler_outlet", "Cooler outlet temperature", "°C", "cooler", 31.0, 0.5, "TS4"),
    sensor(13, "vibration.velocity", "Vibration", "mm/s", "main_pump", 0.55, 0.03, "VS1"),
  ],
  alarms: [
    alarm("TS1_HI", "Oil temperature A high", "medium", "reservoir", "HI", 40.0, "temperature.oil_a"),
    alarm("TS1_HIHI", "Oil temperature A very high", "high", "reservoir", "HIHI", 50.0, "temperature.oil_a"),
    alarm("TS2_HI", "Oil temperature B high", "medium", "reservoir", "HI", 46.0, "temperature.oil_b"),
    alarm("TS2_HIHI", "Oil temperature B very high", "high", "reservoir", "HIHI", 56.0, "temperature.oil_b"),
    alarm("TS3_HI", "Cooler inlet temperature high", "medium", "cooler", "HI", 43.0, "temperature.cooler_inlet"),
    alarm("TS3_HIHI", "Cooler inlet temperature very high", "high", "cooler", "HIHI", 53.0, "temperature.cooler_inlet"),
    alarm("TS4_HI", "Cooler outlet temperature high", "medium", "cooler", "HI", 35.0, "temperature.cooler_outlet"),
    alarm("TS4_HIHI", "Cooler outlet temperature very high", "high", "cooler", "HIHI", 45.0, "temperature.cooler_outlet"),
    alarm("VS1_HI", "Vibration velocity high", "medium", "main_pump", "HI", 0.7, "vibration.velocity"),
    alarm("FS2_LO", "Cooling flow low", "medium", "cooler", "LO", 10.0, "flow.cooling"),
    alarm("PS5_LO", "Cooling pressure A low", "medium", "cooler", "LO", 9.6, "pressure.cooling_a"),
    alarm("PS6_LO", "Cooling pressure B low", "medium", "cooler", "LO", 9.5, "pressure.cooling_b"),
  ],
};

const PRESS = {
  code: "press-line-2",
  name: "Press line 2",
  area: { code: "forming", name: "Forming" },
  line: { code: "line-2", name: "Line 2" },
  cell: { code: "press-cell", name: "Press cell" },
  assetType: { name: "HydraulicPress", version: "1.0.0" },
  illustrative: true,
  flowSlot: "flow.oil",
  components: [
    { code: "ram", name: "Ram", kind: "Actuator", criticality: "high" },
    { code: "power_pack", name: "Power pack", kind: "Pump", criticality: "medium" },
  ],
  sensors: [
    sensor(1, "pressure.main", "Main pressure", "bar", "power_pack", 210, 5),
    sensor(2, "flow.oil", "Oil flow", "l/min", "power_pack", 22, 0.8),
    sensor(3, "power.motor_input", "Main motor power", "W", "power_pack", 14500, 300),
    sensor(4, "temperature.oil", "Oil temperature", "°C", "power_pack", 41, 0.6),
    sensor(5, "rate.strokes", "Stroke rate", "/min", "ram", 18, 0.4),
  ],
  alarms: [],
};

const COMPRESSOR = {
  code: "compressor-c-3",
  name: "Compressor C-3",
  area: { code: "utilities", name: "Utilities" },
  line: { code: "compressor-house", name: "Compressor house" },
  cell: { code: "bay-1", name: "Bay 1" },
  assetType: { name: "AirCompressor", version: "1.0.0" },
  illustrative: true,
  flowSlot: "flow.air",
  components: [
    { code: "air_end", name: "Air end", kind: "Compressor", criticality: "high" },
    { code: "receiver", name: "Air receiver", kind: "Tank", criticality: "low" },
  ],
  sensors: [
    sensor(1, "pressure.discharge", "Discharge pressure", "bar", "receiver", 7.5, 0.1),
    sensor(2, "flow.air", "Air flow", "m³/min", "air_end", 4.2, 0.15),
    sensor(3, "temperature.discharge", "Discharge temperature", "°C", "air_end", 82, 1.0),
    sensor(4, "current.motor", "Motor current", "A", "air_end", 68, 1.5),
    sensor(5, "vibration.velocity", "Vibration", "mm/s", "air_end", 1.2, 0.05),
  ],
  alarms: [],
};

export const MACHINES = [RIG, PRESS, COMPRESSOR];

export const STORY = { lengthS: 1020, cycleS: 60, faultStartS: 600, firstCycleNumber: 796, startIso: "2026-10-23T12:00:00Z" };
