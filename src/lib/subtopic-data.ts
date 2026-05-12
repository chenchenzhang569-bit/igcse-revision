// Static topic + subtopic data for all subjects
// Used by topic page and subtopic page

export interface SubtopicDef {
  slug: string;
  name: string;
  displayName: string;
  pmtCode: string; // e.g. "1.1"
}

export interface TopicDef {
  slug: string;
  name: string;
  displayName: string;
  sort: number;
  subtopics: SubtopicDef[];
}

// ====== CAIE Physics 0625 ======
const PHYSICS_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "motion-forces-energy": [
    { slug: "measurement", name: "Physical Quantities & Measurement", displayName: "Physical Quantities & Measurement", pmtCode: "1.1" },
    { slug: "motion", name: "Motion", displayName: "Motion", pmtCode: "1.2" },
    { slug: "mass-weight", name: "Mass & Weight", displayName: "Mass & Weight", pmtCode: "1.3" },
    { slug: "density", name: "Density", displayName: "Density", pmtCode: "1.4" },
    { slug: "forces", name: "Forces", displayName: "Forces", pmtCode: "1.5" },
    { slug: "momentum", name: "Momentum", displayName: "Momentum", pmtCode: "1.6" },
    { slug: "energy-work-power", name: "Energy, Work & Power", displayName: "Energy, Work & Power", pmtCode: "1.7" },
    { slug: "pressure", name: "Pressure", displayName: "Pressure", pmtCode: "1.8" },
  ],
  "thermal-physics": [
    { slug: "kinetic-model", name: "Kinetic Particle Model", displayName: "Kinetic Particle Model of Matter", pmtCode: "2.1" },
    { slug: "thermal-properties", name: "Thermal Properties & Temperature", displayName: "Thermal Properties & Temperature", pmtCode: "2.2" },
    { slug: "thermal-processes", name: "Thermal Processes", displayName: "Thermal Processes", pmtCode: "2.3" },
  ],
  "waves": [
    { slug: "wave-properties", name: "General Wave Properties", displayName: "General Properties of Waves", pmtCode: "3.1" },
    { slug: "light", name: "Light", displayName: "Light", pmtCode: "3.2" },
    { slug: "em-spectrum", name: "Electromagnetic Spectrum", displayName: "Electromagnetic Spectrum", pmtCode: "3.3" },
    { slug: "sound", name: "Sound", displayName: "Sound", pmtCode: "3.4" },
  ],
  "electricity-magnetism": [
    { slug: "magnetism", name: "Simple Magnetism", displayName: "Simple Phenomena of Magnetism", pmtCode: "4.1" },
    { slug: "electrical-quantities", name: "Electrical Quantities", displayName: "Electrical Quantities", pmtCode: "4.2" },
    { slug: "electric-circuits", name: "Electric Circuits", displayName: "Electric Circuits", pmtCode: "4.3" },
    { slug: "electrical-safety", name: "Electrical Safety", displayName: "Electrical Safety", pmtCode: "4.4" },
    { slug: "electromagnetic-effects", name: "Electromagnetic Effects", displayName: "Electromagnetic Effects", pmtCode: "4.5" },
  ],
  "nuclear-physics": [
    { slug: "nuclear-atom", name: "Nuclear Model of the Atom", displayName: "The Nuclear Model of the Atom", pmtCode: "5.1" },
    { slug: "radioactivity", name: "Radioactivity", displayName: "Radioactivity", pmtCode: "5.2" },
  ],
  "space-physics": [
    { slug: "earth-solar", name: "Earth & Solar System", displayName: "Earth and the Solar System", pmtCode: "6.1" },
    { slug: "stars-universe", name: "Stars & Universe", displayName: "Stars and the Universe", pmtCode: "6.2" },
  ],
  "practical-skills-physics": [
    { slug: "practical-skills", name: "Practical Skills", displayName: "Practical Skills", pmtCode: "PS" },
  ],
};

// ====== CAIE Chemistry 0620 ======
const CHEMISTRY_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "states-of-matter": [
    { slug: "solids-liquids-gases", name: "Solids, Liquids & Gases", displayName: "Solids, Liquids & Gases", pmtCode: "1.1" },
    { slug: "diffusion", name: "Diffusion", displayName: "Diffusion", pmtCode: "1.2" },
  ],
  "atoms-elements-compounds": [
    { slug: "atomic-structure", name: "Atomic Structure", displayName: "Atomic Structure & the Periodic Table", pmtCode: "2.1" },
    { slug: "ions-ionic-bonds", name: "Ions & Ionic Bonds", displayName: "Ions & Ionic Bonds", pmtCode: "2.2" },
    { slug: "covalent-bonds", name: "Covalent Bonds", displayName: "Covalent Bonds", pmtCode: "2.3" },
    { slug: "metallic-bonding", name: "Metallic Bonding", displayName: "Metallic Bonding", pmtCode: "2.4" },
  ],
  "stoichiometry": [
    { slug: "formulae", name: "Formulae", displayName: "Formulae", pmtCode: "3.1" },
    { slug: "mole-concept", name: "The Mole Concept", displayName: "The Mole Concept", pmtCode: "3.2" },
  ],
  "electrochemistry": [
    { slug: "electrolysis", name: "Electrolysis", displayName: "Electrolysis", pmtCode: "4.1" },
    { slug: "applications", name: "Applications of Electrolysis", displayName: "Applications of Electrolysis", pmtCode: "4.2" },
  ],
  "chemical-energetics": [
    { slug: "exothermic-endothermic", name: "Exothermic & Endothermic", displayName: "Exothermic & Endothermic Reactions", pmtCode: "5.1" },
  ],
  "chemical-reactions": [
    { slug: "rate-of-reaction", name: "Rate of Reaction", displayName: "Rate of Reaction", pmtCode: "6.1" },
    { slug: "redox", name: "Redox", displayName: "Redox", pmtCode: "6.2" },
    { slug: "reversible-reactions", name: "Reversible Reactions", displayName: "Reversible Reactions", pmtCode: "6.3" },
  ],
  "acids-bases-salts": [
    { slug: "acids-bases", name: "Acids & Bases", displayName: "The Characteristic Properties of Acids & Bases", pmtCode: "7.1" },
    { slug: "oxides", name: "Oxides", displayName: "Oxides", pmtCode: "7.2" },
    { slug: "salts", name: "Preparation of Salts", displayName: "Preparation of Salts", pmtCode: "7.3" },
  ],
  "periodic-table": [
    { slug: "periodic-trends", name: "Periodic Trends", displayName: "Periodic Trends", pmtCode: "8.1" },
    { slug: "group-properties", name: "Group Properties", displayName: "Group Properties", pmtCode: "8.2" },
    { slug: "transition-elements", name: "Transition Elements", displayName: "Transition Elements", pmtCode: "8.3" },
    { slug: "noble-gases", name: "Noble Gases", displayName: "Noble Gases", pmtCode: "8.4" },
  ],
  "metals": [
    { slug: "metal-properties", name: "Properties of Metals", displayName: "Properties of Metals", pmtCode: "9.1" },
    { slug: "metal-reactivity", name: "Reactivity Series", displayName: "Reactivity Series", pmtCode: "9.2" },
    { slug: "extraction", name: "Extraction of Metals", displayName: "Extraction of Metals", pmtCode: "9.3" },
    { slug: "iron", name: "Iron", displayName: "Iron", pmtCode: "9.4" },
    { slug: "aluminium", name: "Aluminium", displayName: "Aluminium", pmtCode: "9.5" },
  ],
  "chemistry-environment": [
    { slug: "water", name: "Water", displayName: "Water", pmtCode: "10.1" },
    { slug: "air-quality", name: "Air Quality & Climate", displayName: "Air Quality & Climate", pmtCode: "10.2" },
  ],
  "organic-chemistry": [
    { slug: "alkanes", name: "Alkanes", displayName: "Alkanes", pmtCode: "11.1" },
    { slug: "alkenes", name: "Alkenes", displayName: "Alkenes", pmtCode: "11.2" },
    { slug: "alcohols", name: "Alcohols", displayName: "Alcohols", pmtCode: "11.3" },
    { slug: "carboxylic-acids", name: "Carboxylic Acids", displayName: "Carboxylic Acids", pmtCode: "11.4" },
    { slug: "polymers", name: "Polymers", displayName: "Polymers", pmtCode: "11.5" },
  ],
  "experimental-techniques": [
    { slug: "measurement", name: "Measurement", displayName: "Measurement", pmtCode: "12.1" },
    { slug: "separation", name: "Separation & Purification", displayName: "Separation & Purification", pmtCode: "12.2" },
  ],
  "practical-skills-chemistry": [
    { slug: "practical-skills", name: "Practical Skills", displayName: "Practical Skills", pmtCode: "PS" },
  ],
};

// ====== CAIE Biology 0610 ======
const BIOLOGY_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "characteristics-living-organisms": [
    { slug: "characteristics", name: "Characteristics of Living Organisms", displayName: "Characteristics of Living Organisms", pmtCode: "1.1" },
    { slug: "classification", name: "Classification", displayName: "Classification", pmtCode: "1.2" },
  ],
  "organisation-organism": [
    { slug: "cell-structure", name: "Cell Structure", displayName: "Cell Structure", pmtCode: "2.1" },
    { slug: "levels-of-organisation", name: "Levels of Organisation", displayName: "Levels of Organisation", pmtCode: "2.2" },
  ],
  "movement-cells": [
    { slug: "diffusion", name: "Diffusion", displayName: "Diffusion", pmtCode: "3.1" },
    { slug: "osmosis", name: "Osmosis", displayName: "Osmosis", pmtCode: "3.2" },
    { slug: "active-transport", name: "Active Transport", displayName: "Active Transport", pmtCode: "3.3" },
  ],
  "biological-molecules": [
    { slug: "carbohydrates", name: "Carbohydrates", displayName: "Carbohydrates", pmtCode: "4.1" },
    { slug: "lipids", name: "Lipids", displayName: "Lipids", pmtCode: "4.2" },
    { slug: "proteins", name: "Proteins", displayName: "Proteins", pmtCode: "4.3" },
    { slug: "dna", name: "DNA", displayName: "DNA", pmtCode: "4.4" },
  ],
  "enzymes": [
    { slug: "enzyme-action", name: "Enzyme Action", displayName: "Enzyme Action", pmtCode: "5.1" },
  ],
  "plant-nutrition": [
    { slug: "photosynthesis", name: "Photosynthesis", displayName: "Photosynthesis", pmtCode: "6.1" },
    { slug: "leaf-structure", name: "Leaf Structure", displayName: "Leaf Structure", pmtCode: "6.2" },
    { slug: "mineral-nutrition", name: "Mineral Nutrition", displayName: "Mineral Nutrition", pmtCode: "6.3" },
  ],
  "human-nutrition": [
    { slug: "diet", name: "Diet", displayName: "Diet", pmtCode: "7.1" },
    { slug: "digestive-system", name: "Digestive System", displayName: "Digestive System", pmtCode: "7.2" },
    { slug: "absorption", name: "Absorption", displayName: "Absorption", pmtCode: "7.3" },
  ],
  "transport-plants": [
    { slug: "xylem-phloem", name: "Xylem & Phloem", displayName: "Xylem & Phloem", pmtCode: "8.1" },
    { slug: "transpiration", name: "Transpiration", displayName: "Transpiration", pmtCode: "8.2" },
  ],
  "transport-animals": [
    { slug: "circulatory-system", name: "Circulatory System", displayName: "Circulatory System", pmtCode: "9.1" },
    { slug: "heart", name: "Heart", displayName: "Heart", pmtCode: "9.2" },
    { slug: "blood-vessels", name: "Blood Vessels", displayName: "Blood Vessels", pmtCode: "9.3" },
    { slug: "blood", name: "Blood", displayName: "Blood", pmtCode: "9.4" },
  ],
  "diseases-immunity": [
    { slug: "disease", name: "Disease", displayName: "Disease", pmtCode: "10.1" },
    { slug: "immunity", name: "Immunity", displayName: "Immunity", pmtCode: "10.2" },
  ],
  "gas-exchange-humans": [
    { slug: "respiratory-system", name: "Respiratory System", displayName: "Respiratory System", pmtCode: "11.1" },
    { slug: "gas-exchange", name: "Gas Exchange", displayName: "Gas Exchange", pmtCode: "11.2" },
    { slug: "breathing", name: "Breathing", displayName: "Breathing", pmtCode: "11.3" },
  ],
  "respiration": [
    { slug: "aerobic-anaerobic", name: "Aerobic & Anaerobic Respiration", displayName: "Aerobic & Anaerobic Respiration", pmtCode: "12.1" },
  ],
  "excretion-humans": [
    { slug: "kidneys", name: "Kidneys", displayName: "Kidneys", pmtCode: "13.1" },
  ],
  "coordination-response": [
    { slug: "nervous-system", name: "Nervous System", displayName: "Nervous System", pmtCode: "14.1" },
    { slug: "senses", name: "Senses", displayName: "Senses", pmtCode: "14.2" },
    { slug: "hormones", name: "Hormones", displayName: "Hormones", pmtCode: "14.3" },
    { slug: "homeostasis", name: "Homeostasis", displayName: "Homeostasis", pmtCode: "14.4" },
  ],
  "drugs": [
    { slug: "drugs", name: "Drugs", displayName: "Drugs", pmtCode: "15.1" },
    { slug: "antibiotics", name: "Antibiotics", displayName: "Antibiotics", pmtCode: "15.2" },
  ],
  "reproduction": [
    { slug: "asexual", name: "Asexual Reproduction", displayName: "Asexual Reproduction", pmtCode: "16.1" },
    { slug: "sexual-plant", name: "Sexual Reproduction in Plants", displayName: "Sexual Reproduction in Plants", pmtCode: "16.2" },
    { slug: "sexual-human", name: "Sexual Reproduction in Humans", displayName: "Sexual Reproduction in Humans", pmtCode: "16.3" },
  ],
  "inheritance": [
    { slug: "dna-genes", name: "DNA & Genes", displayName: "DNA & Genes", pmtCode: "17.1" },
    { slug: "monohybrid", name: "Monohybrid Inheritance", displayName: "Monohybrid Inheritance", pmtCode: "17.2" },
  ],
  "variation-selection": [
    { slug: "variation", name: "Variation", displayName: "Variation", pmtCode: "18.1" },
    { slug: "selection", name: "Selection", displayName: "Selection", pmtCode: "18.2" },
  ],
  "organisms-environment": [
    { slug: "energy-flow", name: "Energy Flow", displayName: "Energy Flow", pmtCode: "19.1" },
    { slug: "food-chains", name: "Food Chains & Food Webs", displayName: "Food Chains & Food Webs", pmtCode: "19.2" },
    { slug: "nutrient-cycles", name: "Nutrient Cycles", displayName: "Nutrient Cycles", pmtCode: "19.3" },
    { slug: "population", name: "Population", displayName: "Population", pmtCode: "19.4" },
  ],
  "human-influences-ecosystems": [
    { slug: "human-impact", name: "Human Impact", displayName: "Human Impact", pmtCode: "20.1" },
    { slug: "conservation", name: "Conservation", displayName: "Conservation", pmtCode: "20.2" },
  ],
  "biotechnology": [
    { slug: "biotechnology", name: "Biotechnology", displayName: "Biotechnology", pmtCode: "21.1" },
    { slug: "genetic-engineering", name: "Genetic Engineering", displayName: "Genetic Engineering", pmtCode: "21.2" },
  ],
  "practical-skills-biology": [
    { slug: "practical-skills", name: "Practical Skills", displayName: "Practical Skills", pmtCode: "PS" },
  ],
};

// ====== CAIE Mathematics 0580 ======
const MATHEMATICS_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "number": [
    { slug: "types-of-number", name: "Types of Number", displayName: "Types of Number", pmtCode: "1.1" },
    { slug: "fractions-decimals", name: "Fractions & Decimals", displayName: "Fractions & Decimals", pmtCode: "1.2" },
    { slug: "percentages", name: "Percentages", displayName: "Percentages", pmtCode: "1.3" },
    { slug: "ratio-proportion", name: "Ratio & Proportion", displayName: "Ratio & Proportion", pmtCode: "1.4" },
    { slug: "standard-form", name: "Standard Form", displayName: "Standard Form", pmtCode: "1.5" },
    { slug: "estimation", name: "Estimation & Bounds", displayName: "Estimation & Bounds", pmtCode: "1.6" },
  ],
  "algebra-graphs": [
    { slug: "algebraic-expressions", name: "Algebraic Expressions", displayName: "Algebraic Expressions", pmtCode: "2.1" },
    { slug: "equations", name: "Equations", displayName: "Equations", pmtCode: "2.2" },
    { slug: "inequalities", name: "Inequalities", displayName: "Inequalities", pmtCode: "2.3" },
    { slug: "sequences", name: "Sequences", displayName: "Sequences", pmtCode: "2.4" },
    { slug: "graphs", name: "Graphs of Functions", displayName: "Graphs of Functions", pmtCode: "2.5" },
  ],
  "coordinate-geometry": [
    { slug: "straight-line-graphs", name: "Straight Line Graphs", displayName: "Straight Line Graphs", pmtCode: "3.1" },
  ],
  "geometry": [
    { slug: "angles", name: "Angles", displayName: "Angles", pmtCode: "4.1" },
    { slug: "polygons", name: "Polygons", displayName: "Polygons", pmtCode: "4.2" },
    { slug: "circles", name: "Circles", displayName: "Circles", pmtCode: "4.3" },
    { slug: "constructions", name: "Constructions", displayName: "Constructions", pmtCode: "4.4" },
    { slug: "symmetry", name: "Symmetry", displayName: "Symmetry", pmtCode: "4.5" },
    { slug: "similarity-congruence", name: "Similarity & Congruence", displayName: "Similarity & Congruence", pmtCode: "4.6" },
  ],
  "mensuration": [
    { slug: "area", name: "Area", displayName: "Area", pmtCode: "5.1" },
    { slug: "volume-surface-area", name: "Volume & Surface Area", displayName: "Volume & Surface Area", pmtCode: "5.2" },
  ],
  "trigonometry": [
    { slug: "right-triangles", name: "Right-Angled Triangles", displayName: "Right-Angled Triangles", pmtCode: "6.1" },
    { slug: "sine-cosine-rule", name: "Sine & Cosine Rule", displayName: "Sine & Cosine Rule", pmtCode: "6.2" },
    { slug: "trig-graphs", name: "Trigonometric Graphs", displayName: "Trigonometric Graphs", pmtCode: "6.3" },
  ],
  "vectors-transformations": [
    { slug: "vectors", name: "Vectors", displayName: "Vectors", pmtCode: "7.1" },
    { slug: "transformations", name: "Transformations", displayName: "Transformations", pmtCode: "7.2" },
  ],
  "probability": [
    { slug: "basic-probability", name: "Basic Probability", displayName: "Basic Probability", pmtCode: "8.1" },
    { slug: "tree-diagrams", name: "Tree Diagrams", displayName: "Tree Diagrams", pmtCode: "8.2" },
    { slug: "conditional-probability", name: "Conditional Probability", displayName: "Conditional Probability", pmtCode: "8.3" },
  ],
  "statistics": [
    { slug: "data-collection", name: "Data Collection", displayName: "Data Collection", pmtCode: "9.1" },
    { slug: "averages", name: "Averages & Spread", displayName: "Averages & Spread", pmtCode: "9.2" },
    { slug: "charts", name: "Charts & Diagrams", displayName: "Charts & Diagrams", pmtCode: "9.3" },
    { slug: "cumulative-frequency", name: "Cumulative Frequency", displayName: "Cumulative Frequency", pmtCode: "9.4" },
    { slug: "scatter-graphs", name: "Scatter Graphs & Correlation", displayName: "Scatter Graphs & Correlation", pmtCode: "9.5" },
  ],
};

// Master lookup
export const SUBTOPIC_DATA: Record<string, Record<string, SubtopicDef[]>> = {
  physics: PHYSICS_SUBTOPICS,
  chemistry: CHEMISTRY_SUBTOPICS,
  biology: BIOLOGY_SUBTOPICS,
  mathematics: MATHEMATICS_SUBTOPICS,
};

export function getSubtopics(subjectKey: string, topicSlug: string): SubtopicDef[] {
  return SUBTOPIC_DATA[subjectKey]?.[topicSlug] || [];
}

export function getSubtopic(subjectKey: string, topicSlug: string, subtopicSlug: string): SubtopicDef | null {
  const list = getSubtopics(subjectKey, topicSlug);
  return list.find(s => s.slug === subtopicSlug) || null;
}
