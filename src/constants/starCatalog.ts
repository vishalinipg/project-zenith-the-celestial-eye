import { StarCatalogEntry, ConstellationDefinition } from "@/types/celestial";

/**
 * Real equatorial coordinates (J2000, RA in hours, Dec in degrees) and
 * apparent magnitudes for named bright stars in five recognizable
 * constellations. This is a curated subset, not the full Yale Bright Star
 * Catalog — accurate to within a few arcminutes, which is sufficient for
 * sky visualization but NOT for precision astrometry.
 *
 * To upgrade to the full ~9,100-star Yale BSC, replace this file's export
 * with a parsed catalog import and keep the same StarCatalogEntry shape —
 * nothing downstream needs to change.
 */
export const BRIGHT_STAR_CATALOG: StarCatalogEntry[] = [
  // Orion
  { id: "betelgeuse", ra: 5.919, dec: 7.407, magnitude: 0.42, name: "Betelgeuse", colorIndex: 1.85, constellationId: "orion" },
  { id: "rigel", ra: 5.242, dec: -8.202, magnitude: 0.18, name: "Rigel", colorIndex: -0.03, constellationId: "orion" },
  { id: "bellatrix", ra: 5.419, dec: 6.350, magnitude: 1.64, name: "Bellatrix", colorIndex: -0.22, constellationId: "orion" },
  { id: "mintaka", ra: 5.533, dec: -0.299, magnitude: 2.23, name: "Mintaka", colorIndex: -0.18, constellationId: "orion" },
  { id: "alnilam", ra: 5.604, dec: -1.202, magnitude: 1.69, name: "Alnilam", colorIndex: -0.18, constellationId: "orion" },
  { id: "alnitak", ra: 5.679, dec: -1.943, magnitude: 1.74, name: "Alnitak", colorIndex: -0.20, constellationId: "orion" },
  { id: "saiph", ra: 5.796, dec: -9.670, magnitude: 2.07, name: "Saiph", colorIndex: -0.17, constellationId: "orion" },

  // Ursa Major (Big Dipper)
  { id: "dubhe", ra: 11.062, dec: 61.751, magnitude: 1.79, name: "Dubhe", colorIndex: 1.07, constellationId: "ursa-major" },
  { id: "merak", ra: 11.031, dec: 56.382, magnitude: 2.37, name: "Merak", colorIndex: 0.04, constellationId: "ursa-major" },
  { id: "phecda", ra: 11.897, dec: 53.695, magnitude: 2.44, name: "Phecda", colorIndex: 0.04, constellationId: "ursa-major" },
  { id: "megrez", ra: 12.257, dec: 57.033, magnitude: 3.31, name: "Megrez", colorIndex: 0.08, constellationId: "ursa-major" },
  { id: "alioth", ra: 12.900, dec: 55.960, magnitude: 1.77, name: "Alioth", colorIndex: 0.04, constellationId: "ursa-major" },
  { id: "mizar", ra: 13.399, dec: 54.925, magnitude: 2.23, name: "Mizar", colorIndex: 0.02, constellationId: "ursa-major" },
  { id: "alkaid", ra: 13.792, dec: 49.313, magnitude: 1.86, name: "Alkaid", colorIndex: -0.19, constellationId: "ursa-major" },

  // Cassiopeia
  { id: "schedar", ra: 0.675, dec: 56.537, magnitude: 2.24, name: "Schedar", colorIndex: 1.17, constellationId: "cassiopeia" },
  { id: "caph", ra: 0.153, dec: 59.150, magnitude: 2.27, name: "Caph", colorIndex: 0.38, constellationId: "cassiopeia" },
  { id: "gamma-cas", ra: 0.945, dec: 60.717, magnitude: 2.47, name: "Tsih", colorIndex: -0.15, constellationId: "cassiopeia" },
  { id: "ruchbah", ra: 1.430, dec: 60.235, magnitude: 2.68, name: "Ruchbah", colorIndex: 0.15, constellationId: "cassiopeia" },
  { id: "segin", ra: 1.907, dec: 63.670, magnitude: 3.35, name: "Segin", colorIndex: -0.10, constellationId: "cassiopeia" },

  // Scorpius
  { id: "antares", ra: 16.490, dec: -26.432, magnitude: 0.96, name: "Antares", colorIndex: 1.83, constellationId: "scorpius" },
  { id: "graffias", ra: 16.090, dec: -19.806, magnitude: 2.56, name: "Graffias", colorIndex: -0.07, constellationId: "scorpius" },
  { id: "dschubba", ra: 16.006, dec: -22.622, magnitude: 2.29, name: "Dschubba", colorIndex: -0.12, constellationId: "scorpius" },
  { id: "pi-sco", ra: 15.981, dec: -26.114, magnitude: 2.89, name: "Pi Scorpii", colorIndex: -0.18, constellationId: "scorpius" },
  { id: "sigma-sco", ra: 16.353, dec: -25.593, magnitude: 2.89, name: "Sigma Scorpii", colorIndex: -0.18, constellationId: "scorpius" },
  { id: "tau-sco", ra: 16.598, dec: -28.216, magnitude: 2.82, name: "Tau Scorpii", colorIndex: -0.26, constellationId: "scorpius" },
  { id: "epsilon-sco", ra: 16.836, dec: -34.293, magnitude: 2.29, name: "Larawag", colorIndex: 1.16, constellationId: "scorpius" },
  { id: "zeta-sco", ra: 16.900, dec: -42.362, magnitude: 3.62, name: "Zeta Scorpii", colorIndex: 1.78, constellationId: "scorpius" },
  { id: "eta-sco", ra: 17.203, dec: -43.239, magnitude: 3.33, name: "Eta Scorpii", colorIndex: 0.41, constellationId: "scorpius" },
  { id: "theta-sco", ra: 17.622, dec: -42.998, magnitude: 1.86, name: "Sargas", colorIndex: 0.40, constellationId: "scorpius" },
  { id: "iota1-sco", ra: 17.793, dec: -40.127, magnitude: 3.03, name: "Iota Scorpii", colorIndex: 0.42, constellationId: "scorpius" },
  { id: "kappa-sco", ra: 17.708, dec: -39.030, magnitude: 2.39, name: "Girtab", colorIndex: -0.20, constellationId: "scorpius" },
  { id: "lambda-sco", ra: 17.560, dec: -37.104, magnitude: 1.62, name: "Shaula", colorIndex: -0.22, constellationId: "scorpius" },
  { id: "upsilon-sco", ra: 17.513, dec: -37.296, magnitude: 2.69, name: "Lesath", colorIndex: -0.19, constellationId: "scorpius" },

  // Leo
  { id: "regulus", ra: 10.139, dec: 11.967, magnitude: 1.36, name: "Regulus", colorIndex: -0.11, constellationId: "leo" },
  { id: "denebola", ra: 11.818, dec: 14.572, magnitude: 2.14, name: "Denebola", colorIndex: 0.09, constellationId: "leo" },
  { id: "algieba", ra: 10.333, dec: 19.842, magnitude: 2.01, name: "Algieba", colorIndex: 1.14, constellationId: "leo" },
  { id: "zosma", ra: 11.235, dec: 20.524, magnitude: 2.56, name: "Zosma", colorIndex: 0.13, constellationId: "leo" },
  { id: "chertan", ra: 11.237, dec: 15.430, magnitude: 3.34, name: "Chertan", colorIndex: 0.04, constellationId: "leo" },
  { id: "adhafera", ra: 10.278, dec: 23.417, magnitude: 3.44, name: "Adhafera", colorIndex: 0.21, constellationId: "leo" },
  { id: "rasalas", ra: 9.879, dec: 26.007, magnitude: 3.88, name: "Rasalas", colorIndex: 1.41, constellationId: "leo" },
  { id: "epsilon-leo", ra: 9.764, dec: 23.774, magnitude: 2.98, name: "Epsilon Leonis", colorIndex: 0.79, constellationId: "leo" },
];

export const CONSTELLATIONS: ConstellationDefinition[] = [
  {
    id: "orion",
    name: "Orion",
    lines: [
      ["betelgeuse", "alnitak"],
      ["bellatrix", "mintaka"],
      ["mintaka", "alnilam"],
      ["alnilam", "alnitak"],
      ["alnitak", "saiph"],
      ["mintaka", "rigel"],
      ["betelgeuse", "bellatrix"],
    ],
  },
  {
    id: "ursa-major",
    name: "Ursa Major",
    lines: [
      ["dubhe", "merak"],
      ["merak", "phecda"],
      ["phecda", "megrez"],
      ["megrez", "dubhe"],
      ["megrez", "alioth"],
      ["alioth", "mizar"],
      ["mizar", "alkaid"],
    ],
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    lines: [
      ["caph", "schedar"],
      ["schedar", "gamma-cas"],
      ["gamma-cas", "ruchbah"],
      ["ruchbah", "segin"],
    ],
  },
  {
    id: "scorpius",
    name: "Scorpius",
    lines: [
      ["graffias", "dschubba"],
      ["dschubba", "pi-sco"],
      ["dschubba", "antares"],
      ["antares", "tau-sco"],
      ["tau-sco", "epsilon-sco"],
      ["epsilon-sco", "zeta-sco"],
      ["zeta-sco", "eta-sco"],
      ["eta-sco", "theta-sco"],
      ["theta-sco", "iota1-sco"],
      ["iota1-sco", "kappa-sco"],
      ["kappa-sco", "lambda-sco"],
      ["lambda-sco", "upsilon-sco"],
    ],
  },
  {
    id: "leo",
    name: "Leo",
    lines: [
      ["epsilon-leo", "rasalas"],
      ["rasalas", "adhafera"],
      ["adhafera", "algieba"],
      ["algieba", "regulus"],
      ["regulus", "zosma"],
      ["zosma", "denebola"],
      ["zosma", "chertan"],
      ["chertan", "denebola"],
    ],
  },
];
