import { DeepSpaceCatalogEntry } from "@/types/celestial";

export const DEEP_SPACE_CATALOG: DeepSpaceCatalogEntry[] = [
  // ── Nebulae ─────────────────────────────────────────────────────────────────
  {
    id: "m42", name: "Orion Nebula", type: "nebula",
    ra: 5.588, dec: -5.391, magnitude: 4.0, color: "#ff7722",
    description: "A stellar nursery 1,344 light-years away, visible to the naked eye in Orion's sword."
  },
  {
    id: "m57", name: "Ring Nebula", type: "nebula",
    ra: 18.893, dec: 33.028, magnitude: 8.8, color: "#44ddaa",
    description: "A planetary nebula in Lyra — the expelled shell of a dying star 2,300 light-years away."
  },
  {
    id: "m1", name: "Crab Nebula", type: "nebula",
    ra: 5.576, dec: 22.014, magnitude: 8.4, color: "#aaddff",
    description: "Supernova remnant from an explosion observed in 1054 AD, containing a rapidly spinning pulsar."
  },
  {
    id: "m8", name: "Lagoon Nebula", type: "nebula",
    ra: 18.063, dec: -24.383, magnitude: 6.0, color: "#ff4488",
    description: "A giant interstellar cloud 4,100 light-years away, actively forming new stars."
  },
  // ── Galaxies ─────────────────────────────────────────────────────────────────
  {
    id: "m31", name: "Andromeda Galaxy", type: "galaxy",
    ra: 0.712, dec: 41.269, magnitude: 3.44, color: "#ddeeff",
    description: "Our nearest major galactic neighbor, 2.537 million light-years away — visible to the naked eye."
  },
  {
    id: "m33", name: "Triangulum Galaxy", type: "galaxy",
    ra: 1.564, dec: 30.660, magnitude: 5.72, color: "#cceeff",
    description: "The third-largest member of the Local Group, 2.73 million light-years distant."
  },
  {
    id: "m81", name: "Bode's Galaxy", type: "galaxy",
    ra: 9.926, dec: 69.065, magnitude: 6.94, color: "#eeddcc",
    description: "A grand design spiral galaxy 11.8 million light-years away in Ursa Major."
  },
  // ── Comets ───────────────────────────────────────────────────────────────────
  {
    id: "comet-halley", name: "1P/Halley", type: "comet",
    ra: 6.2, dec: 18.0, magnitude: 28.0,
    description: "The most famous periodic comet, returning every 74-79 years. Next perihelion: 2061."
  },
  {
    id: "comet-encke", name: "2P/Encke", type: "comet",
    ra: 3.4, dec: 12.0, magnitude: 11.0,
    description: "The shortest-period comet known (3.3 years), associated with the Taurid meteor shower."
  },
  // ── Asteroids ────────────────────────────────────────────────────────────────
  {
    id: "ceres", name: "Ceres", type: "asteroid",
    ra: 11.2, dec: 8.5, magnitude: 7.0,
    description: "The largest asteroid and only dwarf planet in the asteroid belt, 939 km in diameter."
  },
  {
    id: "vesta", name: "4 Vesta", type: "asteroid",
    ra: 19.5, dec: -18.0, magnitude: 7.5,
    description: "The second-largest asteroid, 525 km wide. Visited by NASA's Dawn spacecraft 2011-2012."
  },
  {
    id: "pallas", name: "2 Pallas", type: "asteroid",
    ra: 22.3, dec: 14.0, magnitude: 8.2,
    description: "The third-largest asteroid at 512 km diameter, discovered in 1802 by Heinrich Olbers."
  },
];
