// Shared topic data and slug parser for all subject-related pages

export interface Topic {
  name: string;
  displayName: string;
  slug: string;
  sort: number;
}

export interface SubjectInfo {
  displayName: string;
  icon: string;
}

// Parse composite slug: "caie-physics-0625" → { board: "CAIE", subjectSlug: "physics", code: "0625" }
export function parseSlug(slug: string) {
  const parts = slug.split("-");
  if (parts.length < 2) return null;
  const boardCode = parts[0].toUpperCase();
  const board = boardCode.startsWith("EDEXCEL") ? "Edexcel" : "CAIE";
  const last = parts[parts.length - 1];
  const code = /^\d/.test(last) ? last : "";
  const subjectSlug = code ? parts.slice(1, -1).join("-") : parts.slice(1).join("-");
  return { board, subjectSlug, code };
}

export const TOPICS: Record<string, Topic[]> = {
  physics: [
    { name: "Motion, forces and energy", displayName: "Motion, Forces & Energy", slug: "motion-forces-energy", sort: 1 },
    { name: "Thermal physics", displayName: "Thermal Physics", slug: "thermal-physics", sort: 2 },
    { name: "Waves", displayName: "Waves", slug: "waves", sort: 3 },
    { name: "Electricity and magnetism", displayName: "Electricity & Magnetism", slug: "electricity-magnetism", sort: 4 },
    { name: "Nuclear physics", displayName: "Nuclear Physics", slug: "nuclear-physics", sort: 5 },
    { name: "Space physics", displayName: "Space Physics", slug: "space-physics", sort: 6 },
  ],
  chemistry: [
    { name: "States of matter", displayName: "States of Matter", slug: "states-of-matter", sort: 1 },
    { name: "Atoms, elements and compounds", displayName: "Atoms, Elements & Compounds", slug: "atoms-elements-compounds", sort: 2 },
    { name: "Stoichiometry", displayName: "Stoichiometry", slug: "stoichiometry", sort: 3 },
    { name: "Electrochemistry", displayName: "Electrochemistry", slug: "electrochemistry", sort: 4 },
    { name: "Chemical energetics", displayName: "Chemical Energetics", slug: "chemical-energetics", sort: 5 },
    { name: "Chemical reactions", displayName: "Chemical Reactions", slug: "chemical-reactions", sort: 6 },
    { name: "Acids, bases and salts", displayName: "Acids, Bases & Salts", slug: "acids-bases-salts", sort: 7 },
    { name: "The Periodic Table", displayName: "The Periodic Table", slug: "periodic-table", sort: 8 },
    { name: "Metals", displayName: "Metals", slug: "metals", sort: 9 },
    { name: "Chemistry of the environment", displayName: "Chemistry of the Environment", slug: "chemistry-environment", sort: 10 },
    { name: "Organic chemistry", displayName: "Organic Chemistry", slug: "organic-chemistry", sort: 11 },
    { name: "Experimental techniques", displayName: "Experimental Techniques", slug: "experimental-techniques", sort: 12 },
  ],
  biology: [
    { name: "Characteristics of living organisms", displayName: "Characteristics of Living Organisms", slug: "characteristics-living-organisms", sort: 1 },
    { name: "Organisation of the organism", displayName: "Organisation of the Organism", slug: "organisation-organism", sort: 2 },
    { name: "Movement into and out of cells", displayName: "Movement In & Out of Cells", slug: "movement-cells", sort: 3 },
    { name: "Biological molecules", displayName: "Biological Molecules", slug: "biological-molecules", sort: 4 },
    { name: "Enzymes", displayName: "Enzymes", slug: "enzymes", sort: 5 },
    { name: "Plant nutrition", displayName: "Plant Nutrition", slug: "plant-nutrition", sort: 6 },
    { name: "Human nutrition", displayName: "Human Nutrition", slug: "human-nutrition", sort: 7 },
    { name: "Transport in plants", displayName: "Transport in Plants", slug: "transport-plants", sort: 8 },
    { name: "Transport in animals", displayName: "Transport in Animals", slug: "transport-animals", sort: 9 },
    { name: "Diseases and immunity", displayName: "Diseases & Immunity", slug: "diseases-immunity", sort: 10 },
    { name: "Gas exchange in humans", displayName: "Gas Exchange in Humans", slug: "gas-exchange-humans", sort: 11 },
    { name: "Respiration", displayName: "Respiration", slug: "respiration", sort: 12 },
    { name: "Excretion in humans", displayName: "Excretion in Humans", slug: "excretion-humans", sort: 13 },
    { name: "Coordination and response", displayName: "Coordination & Response", slug: "coordination-response", sort: 14 },
    { name: "Drugs", displayName: "Drugs", slug: "drugs", sort: 15 },
    { name: "Reproduction", displayName: "Reproduction", slug: "reproduction", sort: 16 },
    { name: "Inheritance", displayName: "Inheritance", slug: "inheritance", sort: 17 },
    { name: "Variation and selection", displayName: "Variation & Selection", slug: "variation-selection", sort: 18 },
    { name: "Organisms and their environment", displayName: "Organisms & Their Environment", slug: "organisms-environment", sort: 19 },
    { name: "Human influences on ecosystems", displayName: "Human Influences on Ecosystems", slug: "human-influences-ecosystems", sort: 20 },
    { name: "Biotechnology", displayName: "Biotechnology & Genetic Modification", slug: "biotechnology", sort: 21 },
  ],
  mathematics: [
    { name: "Number", displayName: "Number", slug: "number", sort: 1 },
    { name: "Algebra and graphs", displayName: "Algebra & Graphs", slug: "algebra-graphs", sort: 2 },
    { name: "Coordinate geometry", displayName: "Coordinate Geometry", slug: "coordinate-geometry", sort: 3 },
    { name: "Geometry", displayName: "Geometry", slug: "geometry", sort: 4 },
    { name: "Mensuration", displayName: "Mensuration", slug: "mensuration", sort: 5 },
    { name: "Trigonometry", displayName: "Trigonometry", slug: "trigonometry", sort: 6 },
    { name: "Vectors and transformations", displayName: "Vectors & Transformations", slug: "vectors-transformations", sort: 7 },
    { name: "Probability", displayName: "Probability", slug: "probability", sort: 8 },
    { name: "Statistics", displayName: "Statistics", slug: "statistics", sort: 9 },
  ],
};

export const SUBJECT_NAMES: Record<string, SubjectInfo> = {
  physics:     { displayName: "Physics",     icon: "⚛️" },
  chemistry:   { displayName: "Chemistry",   icon: "🧪" },
  biology:     { displayName: "Biology",     icon: "🧬" },
  mathematics: { displayName: "Mathematics", icon: "📐" },
};
