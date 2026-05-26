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
    { slug: "thermal-processes", name: "Transfer of thermal energy", displayName: "Transfer of thermal energy", pmtCode: "2.3" },
  ],
  "waves": [
    { slug: "wave-properties", name: "General Wave Properties", displayName: "General Properties of Waves", pmtCode: "3.1" },
    { slug: "light", name: "Light", displayName: "Light", pmtCode: "3.2" },
    { slug: "em-spectrum", name: "Electromagnetic Spectrum", displayName: "Electromagnetic Spectrum", pmtCode: "3.3" },
    { slug: "sound", name: "Sound", displayName: "Sound", pmtCode: "3.4" },
  ],
  "electricity-magnetism": [
    { slug: "magnetism", name: "Simple phenomena of magnetism", displayName: "Simple phenomena of magnetism", pmtCode: "4.1" },
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
    { slug: "elements-compounds-mixtures", name: "Elements, Compounds & Mixtures", displayName: "Elements, Compounds & Mixtures", pmtCode: "2.1" },
    { slug: "atomic-structure", name: "Atomic Structure", displayName: "Atomic Structure & the Periodic Table", pmtCode: "2.2" },
    { slug: "isotopes", name: "Isotopes", displayName: "Isotopes", pmtCode: "2.3" },
    { slug: "ions-ionic-bonds", name: "Ions & Ionic Bonds", displayName: "Ions & Ionic Bonds", pmtCode: "2.4" },
    { slug: "covalent-bonds", name: "Covalent Bonds", displayName: "Covalent Bonds", pmtCode: "2.5" },
    { slug: "giant-structures", name: "Giant Structures", displayName: "Giant Structures", pmtCode: "2.6" },
    { slug: "metallic-bonding", name: "Metallic Bonding", displayName: "Metallic Bonding", pmtCode: "2.7" },
  ],
  "stoichiometry": [
    { slug: "formulae", name: "Formulae", displayName: "Formulae", pmtCode: "3.1" },
    { slug: "relative-masses", name: "Relative Masses", displayName: "Relative Masses of Atoms & Molecules", pmtCode: "3.2" },
    { slug: "mole", name: "The Mole", displayName: "The Mole & Avogadro Constant", pmtCode: "3.3" },
  ],
  "electrochemistry": [
    { slug: "electrolysis", name: "Electrolysis", displayName: "Electrolysis", pmtCode: "4.1" },
    { slug: "hydrogen-fuel-cells", name: "Hydrogen–Oxygen Fuel Cells", displayName: "Hydrogen–Oxygen Fuel Cells", pmtCode: "4.2" },
  ],
  "chemical-energetics": [
    { slug: "exothermic-endothermic", name: "Exothermic & Endothermic", displayName: "Exothermic & Endothermic Reactions", pmtCode: "5.1" },
  ],
  "chemical-reactions": [
    { slug: "physical-chemical-changes", name: "Physical & Chemical Changes", displayName: "Physical & Chemical Changes", pmtCode: "6.1" },
    { slug: "rate-of-reaction", name: "Rate of Reaction", displayName: "Rate of Reaction", pmtCode: "6.2" },
    { slug: "reversible-equilibrium", name: "Reversible Reactions & Equilibrium", displayName: "Reversible Reactions & Equilibrium", pmtCode: "6.3" },
    { slug: "redox", name: "Redox", displayName: "Redox", pmtCode: "6.4" },
  ],
  "acids-bases-salts": [
    { slug: "acids-bases", name: "Acids & Bases", displayName: "The Characteristic Properties of Acids & Bases", pmtCode: "7.1" },
    { slug: "oxides", name: "Oxides", displayName: "Oxides", pmtCode: "7.2" },
    { slug: "salts", name: "Preparation of Salts", displayName: "Preparation of Salts", pmtCode: "7.3" },
  ],
  "periodic-table": [
    { slug: "arrangement-of-elements", name: "Arrangement of Elements", displayName: "Arrangement of Elements", pmtCode: "8.1" },
    { slug: "group-i", name: "Group I Properties", displayName: "Group I Properties", pmtCode: "8.2" },
    { slug: "group-vii", name: "Group VII Properties", displayName: "Group VII Properties", pmtCode: "8.3" },
    { slug: "transition-elements", name: "Transition Elements", displayName: "Transition Elements", pmtCode: "8.4" },
    { slug: "noble-gases", name: "Noble Gases", displayName: "Noble Gases", pmtCode: "8.5" },
  ],
  "metals": [
    { slug: "properties-of-metals", name: "Properties of Metals", displayName: "Properties of Metals", pmtCode: "9.1" },
    { slug: "uses-of-metals", name: "Uses of Metals", displayName: "Uses of Metals", pmtCode: "9.2" },
    { slug: "alloys", name: "Alloys and Their Properties", displayName: "Alloys and Their Properties", pmtCode: "9.3" },
    { slug: "reactivity-series", name: "Reactivity Series", displayName: "Reactivity Series", pmtCode: "9.4" },
    { slug: "corrosion", name: "Corrosion of Metals", displayName: "Corrosion of Metals", pmtCode: "9.5" },
    { slug: "extraction", name: "Extraction of Metals", displayName: "Extraction of Metals", pmtCode: "9.6" },
  ],
  "chemistry-environment": [
    { slug: "water", name: "Water", displayName: "Water", pmtCode: "10.1" },
    { slug: "fertilisers", name: "Fertilisers", displayName: "Fertilisers", pmtCode: "10.2" },
    { slug: "air-quality-climate", name: "Air Quality & Climate", displayName: "Air Quality & Climate", pmtCode: "10.3" },
  ],
  "organic-chemistry": [
    { slug: "formulae-functional-groups", name: "Formulae, Functional Groups & Terminology", displayName: "Formulae, Functional Groups & Terminology", pmtCode: "11.1" },
    { slug: "naming-organic-compounds", name: "Naming Organic Compounds", displayName: "Naming Organic Compounds", pmtCode: "11.2" },
    { slug: "fuels", name: "Fuels", displayName: "Fuels", pmtCode: "11.3" },
    { slug: "alkanes", name: "Alkanes", displayName: "Alkanes", pmtCode: "11.4" },
    { slug: "alkenes", name: "Alkenes", displayName: "Alkenes", pmtCode: "11.5" },
    { slug: "alcohols", name: "Alcohols", displayName: "Alcohols", pmtCode: "11.6" },
    { slug: "carboxylic-acids", name: "Carboxylic Acids", displayName: "Carboxylic Acids", pmtCode: "11.7" },
    { slug: "polymers", name: "Polymers", displayName: "Polymers", pmtCode: "11.8" },
  ],
  "experimental-techniques": [
    { slug: "experimental-design", name: "Experimental Design", displayName: "Experimental Design", pmtCode: "12.1" },
    { slug: "acid-base-titrations", name: "Acid–Base Titrations", displayName: "Acid–Base Titrations", pmtCode: "12.2" },
    { slug: "chromatography", name: "Chromatography", displayName: "Chromatography", pmtCode: "12.3" },
    { slug: "separation-purification", name: "Separation & Purification", displayName: "Separation & Purification", pmtCode: "12.4" },
    { slug: "identification-ions-gases", name: "Identification of Ions & Gases", displayName: "Identification of Ions & Gases", pmtCode: "12.5" },
  ],
  "practical-skills-chemistry": [
    { slug: "practical-skills", name: "Practical Skills", displayName: "Practical Skills", pmtCode: "PS" },
  ],
};

// ====== CAIE Biology 0610 ======
const BIOLOGY_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "characteristics-living-organisms": [
    { slug: "characteristics", name: "Characteristics of Living Organisms", displayName: "Characteristics of Living Organisms", pmtCode: "1.1" },
    { slug: "classification-systems", name: "Concept and Uses of Classification Systems", displayName: "Concept and Uses of Classification Systems", pmtCode: "1.2" },
    { slug: "features-of-organisms", name: "Features of Organisms", displayName: "Features of Organisms", pmtCode: "1.3" },
  ],
  "organisation-organism": [
    { slug: "cell-structure", name: "Cell Structure", displayName: "Cell Structure", pmtCode: "2.1" },
    { slug: "size-of-specimens", name: "Size of Specimens", displayName: "Size of Specimens", pmtCode: "2.2" },
  ],
  "movement-cells": [
    { slug: "diffusion", name: "Diffusion", displayName: "Diffusion", pmtCode: "3.1" },
    { slug: "osmosis", name: "Osmosis", displayName: "Osmosis", pmtCode: "3.2" },
    { slug: "active-transport", name: "Active Transport", displayName: "Active Transport", pmtCode: "3.3" },
  ],
  "biological-molecules": [
    { slug: "biological-molecules", name: "Biological Molecules", displayName: "Biological Molecules", pmtCode: "4.1" },
  ],
  "enzymes": [
    { slug: "enzymes", name: "Enzymes", displayName: "Enzymes", pmtCode: "5.1" },
  ],
  "plant-nutrition": [
    { slug: "photosynthesis", name: "Photosynthesis", displayName: "Photosynthesis", pmtCode: "6.1" },
    { slug: "leaf-structure", name: "Leaf Structure", displayName: "Leaf Structure", pmtCode: "6.2" },
  ],
 "human-nutrition": [
   { slug: "diet", name: "Diet", displayName: "Diet", pmtCode: "7.1" },
   { slug: "alimentary-canal", name: "Alimentary Canal", displayName: "Alimentary Canal", pmtCode: "7.2" },
   { slug: "absorption", name: "Absorption", displayName: "Absorption", pmtCode: "7.3" },
 ],
  "transport-plants": [
    { slug: "xylem-phloem", name: "Xylem and Phloem", displayName: "Xylem and Phloem", pmtCode: "8.1" },
    { slug: "transpiration", name: "Transpiration", displayName: "Transpiration", pmtCode: "8.2" },
    { slug: "translocation", name: "Translocation", displayName: "Translocation", pmtCode: "8.3" },
  ],
  "transport-animals": [
    { slug: "circulatory-systems", name: "Circulatory Systems", displayName: "Circulatory Systems", pmtCode: "9.1" },
    { slug: "heart", name: "Heart", displayName: "Heart", pmtCode: "9.2" },
    { slug: "blood-vessels", name: "Blood Vessels", displayName: "Blood Vessels", pmtCode: "9.3" },
    { slug: "blood", name: "Blood", displayName: "Blood", pmtCode: "9.4" },
  ],
  "diseases-immunity": [
    { slug: "diseases-immunity", name: "Diseases and Immunity", displayName: "Diseases and Immunity", pmtCode: "10.1" },
  ],
  "gas-exchange-humans": [
    { slug: "gas-exchange-humans", name: "Gas Exchange in Humans", displayName: "Gas Exchange in Humans", pmtCode: "11.1" },
  ],
  "respiration": [
    { slug: "respiration", name: "Respiration", displayName: "Respiration", pmtCode: "12.1" },
    { slug: "anaerobic-respiration", name: "Anaerobic Respiration", displayName: "Anaerobic Respiration", pmtCode: "12.2" },
  ],
  "excretion-humans": [
    { slug: "excretion-humans", name: "Excretion in Humans", displayName: "Excretion in Humans", pmtCode: "13.1" },
  ],
  "coordination-response": [
    { slug: "nervous-control", name: "Nervous Control in Humans", displayName: "Nervous Control in Humans", pmtCode: "14.1" },
    { slug: "sense-organs", name: "Sense Organs", displayName: "Sense Organs", pmtCode: "14.2" },
    { slug: "hormones", name: "Hormones", displayName: "Hormones", pmtCode: "14.3" },
    { slug: "homeostasis", name: "Homeostasis", displayName: "Homeostasis", pmtCode: "14.4" },
    { slug: "tropic-responses", name: "Tropic Responses", displayName: "Tropic Responses", pmtCode: "14.5" },
  ],
  "drugs": [
    { slug: "drugs", name: "Drugs", displayName: "Drugs", pmtCode: "15.1" },
  ],
  "reproduction": [
    { slug: "asexual-reproduction", name: "Asexual Reproduction", displayName: "Asexual Reproduction", pmtCode: "16.1" },
    { slug: "sexual-reproduction", name: "Sexual Reproduction", displayName: "Sexual Reproduction", pmtCode: "16.2" },
    { slug: "sexual-reproduction-plants", name: "Sexual Reproduction in Plants", displayName: "Sexual Reproduction in Plants", pmtCode: "16.3" },
    { slug: "sexual-reproduction-humans", name: "Sexual Reproduction in Humans", displayName: "Sexual Reproduction in Humans", pmtCode: "16.4" },
    { slug: "sexual-hormones-humans", name: "Sex Hormones in Humans", displayName: "Sex Hormones in Humans", pmtCode: "16.5" },
    { slug: "contraception", name: "Contraception", displayName: "Contraception", pmtCode: "16.6" },
    { slug: "sexually-transmitted-infections", name: "Sexually Transmitted Infections", displayName: "Sexually Transmitted Infections", pmtCode: "16.7" },
  ],
  "inheritance": [
    { slug: "chromosomes-genes-proteins", name: "Chromosomes, Genes and Proteins", displayName: "Chromosomes, Genes and Proteins", pmtCode: "17.1" },
    { slug: "mitosis", name: "Mitosis", displayName: "Mitosis", pmtCode: "17.2" },
    { slug: "meiosis", name: "Meiosis", displayName: "Meiosis", pmtCode: "17.3" },
    { slug: "monohybrid-inheritance", name: "Monohybrid Inheritance", displayName: "Monohybrid Inheritance", pmtCode: "17.4" },
  ],
  "variation-selection": [
    { slug: "variation", name: "Variation", displayName: "Variation", pmtCode: "18.1" },
    { slug: "adaptive-features", name: "Adaptive Features", displayName: "Adaptive Features", pmtCode: "18.2" },
    { slug: "selection", name: "Selection", displayName: "Selection", pmtCode: "18.3" },
  ],
  "organisms-environment": [
    { slug: "energy-flow", name: "Energy Flow", displayName: "Energy Flow", pmtCode: "19.1" },
    { slug: "food-chains-food-webs", name: "Food Chains and Food Webs", displayName: "Food Chains and Food Webs", pmtCode: "19.2" },
    { slug: "nutrient-cycles", name: "Nutrient Cycles", displayName: "Nutrient Cycles", pmtCode: "19.3" },
    { slug: "populations", name: "Populations", displayName: "Populations", pmtCode: "19.4" },
  ],
  "human-influences-ecosystems": [
    { slug: "food-supply", name: "Food Supply", displayName: "Food Supply", pmtCode: "20.1" },
    { slug: "habitat-destruction", name: "Habitat Destruction", displayName: "Habitat Destruction", pmtCode: "20.2" },
    { slug: "pollution", name: "Pollution", displayName: "Pollution", pmtCode: "20.3" },
  ],
  "biotechnology": [
    { slug: "biotechnology", name: "Biotechnology", displayName: "Biotechnology", pmtCode: "21.1" },
    { slug: "genetic-modification", name: "Genetic Modification", displayName: "Genetic Modification", pmtCode: "21.2" },
  ],
  "practical-skills-biology": [
    { slug: "practical-skills", name: "Practical Skills", displayName: "Practical Skills", pmtCode: "PS" },
  ],
};

// ====== CAIE Mathematics 0580 (SME-aligned: 9 sections, 44 subtopics) ======
const MATHEMATICS_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "number": [
    { slug: "types-of-numbers", name: "Types of Numbers", displayName: "Types of Numbers", pmtCode: "1.1" },
    { slug: "prime-factors-hcf-lcm", name: "Prime Factors, HCF & LCM", displayName: "Prime Factors, HCF & LCM", pmtCode: "1.2" },
    { slug: "powers-roots-standard-form", name: "Powers, Roots & Standard Form", displayName: "Powers, Roots & Standard Form", pmtCode: "1.3" },
    { slug: "fractions-decimals-percentages", name: "Fractions, Decimals & Percentages", displayName: "Fractions, Decimals & Percentages", pmtCode: "1.4" },
    { slug: "introduction-to-fractions", name: "Introduction to Fractions", displayName: "Introduction to Fractions", pmtCode: "1.5" },
    { slug: "operations-with-fractions", name: "Operations with Fractions", displayName: "Operations with Fractions", pmtCode: "1.6" },
    { slug: "percentages", name: "Percentages", displayName: "Percentages", pmtCode: "1.7" },
    { slug: "ratio-proportion", name: "Ratio & Proportion", displayName: "Ratio & Proportion", pmtCode: "1.8" },
    { slug: "simple-compound-interest", name: "Simple & Compound Interest", displayName: "Simple & Compound Interest", pmtCode: "1.9" },
    { slug: "money-calculations", name: "Money Calculations", displayName: "Money Calculations", pmtCode: "1.10" },
    { slug: "time-currency-conversions", name: "Time, Currency & Conversions", displayName: "Time, Currency & Conversions", pmtCode: "1.11" },
    { slug: "rounding-estimation-bounds", name: "Rounding, Estimation & Bounds", displayName: "Rounding, Estimation & Bounds", pmtCode: "1.12" },
    { slug: "operations-numbers-decimals", name: "Operations with Numbers & Decimals", displayName: "Operations with Numbers & Decimals", pmtCode: "1.13" },
    { slug: "reading-ordering-numbers", name: "Reading & Ordering Numbers", displayName: "Reading & Ordering Numbers", pmtCode: "1.14" },
    { slug: "using-a-calculator", name: "Using a Calculator", displayName: "Using a Calculator", pmtCode: "1.15" },
    { slug: "compound-measures", name: "Compound Measures", displayName: "Compound Measures", pmtCode: "1.16" },
  ],
  "algebra-graphs": [
    { slug: "introduction-to-algebra", name: "Introduction to Algebra", displayName: "Introduction to Algebra", pmtCode: "2.1" },
    { slug: "linear-equations", name: "Linear Equations", displayName: "Linear Equations", pmtCode: "2.2" },
    { slug: "simultaneous-equations", name: "Simultaneous Equations", displayName: "Simultaneous Equations", pmtCode: "2.3" },
    { slug: "inequalities", name: "Inequalities", displayName: "Inequalities", pmtCode: "2.4" },
    { slug: "expanding-factorising-brackets", name: "Expanding & Factorising Brackets", displayName: "Expanding & Factorising Brackets", pmtCode: "2.5" },
    { slug: "rearranging-formulas", name: "Rearranging Formulas", displayName: "Rearranging Formulas", pmtCode: "2.6" },
    { slug: "sequences", name: "Sequences", displayName: "Sequences", pmtCode: "2.7" },
    { slug: "algebraic-roots-indices", name: "Algebraic Roots & Indices", displayName: "Algebraic Roots & Indices", pmtCode: "2.8" },
  ],
  "coordinate-geometry": [
    { slug: "linear-graphs", name: "Linear Graphs", displayName: "Linear Graphs", pmtCode: "3.1" },
    { slug: "further-graphs", name: "Further Graphs", displayName: "Further Graphs", pmtCode: "3.2" },
    { slug: "real-life-graphs", name: "Real-Life Graphs", displayName: "Real-Life Graphs", pmtCode: "3.3" },
  ],
  "geometry": [
    { slug: "basic-angle-properties", name: "Basic Angle Properties", displayName: "Basic Angle Properties", pmtCode: "4.1" },
    { slug: "angles-polygons-parallel-lines", name: "Angles in Polygons & Parallel Lines", displayName: "Angles in Polygons & Parallel Lines", pmtCode: "4.2" },
    { slug: "circle-theorems", name: "Circle Theorems", displayName: "Circle Theorems", pmtCode: "4.3" },
    { slug: "bearings-constructions-scale-drawings", name: "Bearings, Constructions & Scale Drawings", displayName: "Bearings, Constructions & Scale Drawings", pmtCode: "4.4" },
    { slug: "symmetry-shapes", name: "Symmetry & Shapes", displayName: "Symmetry & Shapes", pmtCode: "4.5" },
  ],
  "mensuration": [
    { slug: "congruence-similarity", name: "Congruence & Similarity", displayName: "Congruence & Similarity", pmtCode: "5.1" },
    { slug: "area-perimeter", name: "Area & Perimeter", displayName: "Area & Perimeter", pmtCode: "5.2" },
    { slug: "volume-surface-area", name: "Volume & Surface Area", displayName: "Volume & Surface Area", pmtCode: "5.3" },
    { slug: "circles-arcs-sectors", name: "Circles, Arcs & Sectors", displayName: "Circles, Arcs & Sectors", pmtCode: "5.4" },
  ],
  "trigonometry": [
    { slug: "pythagoras", name: "Pythagoras", displayName: "Pythagoras", pmtCode: "6.1" },
    { slug: "trigonometry", name: "Trigonometry", displayName: "Trigonometry", pmtCode: "6.2" },
  ],
  "vectors-transformations": [
    { slug: "transformations", name: "Transformations", displayName: "Transformations", pmtCode: "7.1" },
  ],
  "probability": [
    { slug: "basic-probability", name: "Basic Probability", displayName: "Basic Probability", pmtCode: "8.1" },
    { slug: "set-notation-probability-diagrams", name: "Set Notation & Probability Diagrams", displayName: "Set Notation & Probability Diagrams", pmtCode: "8.2" },
  ],
  "statistics": [
    { slug: "averages-range", name: "Averages & Range", displayName: "Averages & Range", pmtCode: "9.1" },
    { slug: "statistical-diagrams", name: "Statistical Diagrams", displayName: "Statistical Diagrams", pmtCode: "9.2" },
    { slug: "scatter-graphs-correlation", name: "Scatter Graphs & Correlation", displayName: "Scatter Graphs & Correlation", pmtCode: "9.3" },
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
