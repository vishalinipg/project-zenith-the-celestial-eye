export const COLORS = {
  spaceBlack: "#05070B",
  deepNavy: "#09111F",
  midnightBlue: "#0E1628",
  softWhite: "#E8EDF5",
  cyanAccent: "#78C8FF",
} as const;

/** Color temperature buckets for stars, derived from B-V index ranges. */
export const STAR_COLOR_BY_INDEX = [
  { maxIndex: -0.3, color: "#9bb8ff" }, // blue-white (O/B class)
  { maxIndex: 0.3, color: "#e8edf5" }, // white (A/F class)
  { maxIndex: 0.8, color: "#fff4d6" }, // yellow-white (G class, like our Sun)
  { maxIndex: 1.4, color: "#ffd9a0" }, // orange (K class)
  { maxIndex: Infinity, color: "#ffb38a" }, // red (M class)
] as const;
