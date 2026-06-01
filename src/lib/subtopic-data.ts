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

// ====== CAIE Mathematics 0580 ======
const MATHEMATICS_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "number": [
    { slug: "types-of-numbers", name: "Types of Numbers", displayName: "Types of Numbers", pmtCode: "1.1" },
    { slug: "reading-and-ordering-numbers", name: "Reading & Ordering Numbers", displayName: "Reading & Ordering Numbers", pmtCode: "1.2" },
    { slug: "operations-with-numbers-and-decimals", name: "Operations with Numbers & Decimals", displayName: "Operations with Numbers & Decimals", pmtCode: "1.3" },
    { slug: "prime-factors-hcf-and-lcm", name: "Prime Factors, HCF & LCM", displayName: "Prime Factors, HCF & LCM", pmtCode: "1.4" },
    { slug: "powers-roots-and-standard-form", name: "Powers, Roots & Standard Form", displayName: "Powers, Roots & Standard Form", pmtCode: "1.5" },
    { slug: "introduction-to-fractions", name: "Introduction to Fractions", displayName: "Introduction to Fractions", pmtCode: "1.6" },
    { slug: "operations-with-fractions", name: "Operations with Fractions", displayName: "Operations with Fractions", pmtCode: "1.7" },
    { slug: "percentages", name: "Percentages", displayName: "Percentages", pmtCode: "1.8" },
    { slug: "simple-and-compound-interest", name: "Simple & Compound Interest", displayName: "Simple & Compound Interest", pmtCode: "1.9" },
    { slug: "fractions-decimals-and-percentages", name: "Fractions, Decimals & Percentages", displayName: "Fractions, Decimals & Percentages", pmtCode: "1.10" },
    { slug: "ratio-and-proportion", name: "Ratio & Proportion", displayName: "Ratio & Proportion", pmtCode: "1.11" },
    { slug: "money-calculations", name: "Money Calculations", displayName: "Money Calculations", pmtCode: "1.12" },
    { slug: "time-currency-and-conversions", name: "Time, Currency & Conversions", displayName: "Time, Currency & Conversions", pmtCode: "1.13" },
    { slug: "compound-measures", name: "Compound Measures", displayName: "Compound Measures", pmtCode: "1.14" },
    { slug: "rounding-estimation-and-bounds", name: "Rounding, Estimation & Bounds", displayName: "Rounding, Estimation & Bounds", pmtCode: "1.15" },
    { slug: "using-a-calculator", name: "Using a Calculator", displayName: "Using a Calculator", pmtCode: "1.16" },
  ],
  "algebra-graphs": [
    { slug: "introduction-to-algebra", name: "Introduction to Algebra", displayName: "Introduction to Algebra", pmtCode: "2.1" },
    { slug: "algebraic-roots-and-indices", name: "Algebraic Roots & Indices", displayName: "Algebraic Roots & Indices", pmtCode: "2.2" },
    { slug: "expanding-and-factorising-brackets", name: "Expanding & Factorising Brackets", displayName: "Expanding & Factorising Brackets", pmtCode: "2.3" },
    { slug: "linear-equations", name: "Linear Equations", displayName: "Linear Equations", pmtCode: "2.4" },
    { slug: "inequalities", name: "Inequalities", displayName: "Inequalities", pmtCode: "2.5" },
    { slug: "rearranging-formulas", name: "Rearranging Formulas", displayName: "Rearranging Formulas", pmtCode: "2.6" },
    { slug: "simultaneous-equations", name: "Simultaneous Equations", displayName: "Simultaneous Equations", pmtCode: "2.7" },
    { slug: "sequences", name: "Sequences", displayName: "Sequences", pmtCode: "2.8" },
  ],
  "coordinate-geometry": [
    { slug: "linear-graphs", name: "Linear Graphs", displayName: "Linear Graphs", pmtCode: "3.1" },
    { slug: "further-graphs", name: "Further Graphs", displayName: "Further Graphs", pmtCode: "3.2" },
    { slug: "real-life-graphs", name: "Real-Life Graphs", displayName: "Real-Life Graphs", pmtCode: "3.3" },
  ],
  "geometry": [
    { slug: "symmetry-and-shapes", name: "Symmetry & Shapes", displayName: "Symmetry & Shapes", pmtCode: "4.1" },
    { slug: "basic-angle-properties", name: "Basic Angle Properties", displayName: "Basic Angle Properties", pmtCode: "4.2" },
    { slug: "angles-in-polygons-and-parallel-lines", name: "Angles in Polygons & Parallel Lines", displayName: "Angles in Polygons & Parallel Lines", pmtCode: "4.3" },
    { slug: "bearings-constructions-and-scale-drawings", name: "Bearings, Constructions & Scale Drawings", displayName: "Bearings, Constructions & Scale Drawings", pmtCode: "4.4" },
    { slug: "circle-theorems", name: "Circle Theorems", displayName: "Circle Theorems", pmtCode: "4.5" },
  ],
  "mensuration": [
    { slug: "volume-and-surface-area", name: "Volume & Surface Area", displayName: "Volume & Surface Area", pmtCode: "5.1" },
    { slug: "congruence-and-similarity", name: "Congruence & Similarity", displayName: "Congruence & Similarity", pmtCode: "5.2" },
    { slug: "area-and-perimeter", name: "Area & Perimeter", displayName: "Area & Perimeter", pmtCode: "5.3" },
    { slug: "circles-arcs-and-sectors", name: "Circles, Arcs & Sectors", displayName: "Circles, Arcs & Sectors", pmtCode: "5.4" },
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
    { slug: "set-notation-and-probability-diagrams", name: "Set Notation & Probability Diagrams", displayName: "Set Notation & Probability Diagrams", pmtCode: "8.2" },
  ],
  "statistics": [
    { slug: "averages-and-range", name: "Averages & Range", displayName: "Averages & Range", pmtCode: "9.1" },
    { slug: "statistical-diagrams", name: "Statistical Diagrams", displayName: "Statistical Diagrams", pmtCode: "9.2" },
    { slug: "scatter-graphs-and-correlation", name: "Scatter Graphs & Correlation", displayName: "Scatter Graphs & Correlation", pmtCode: "9.3" },
  ],
};

// Master lookup
// Computer Science 0478
const CS_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "data-representation": [
    { slug: "caie-computer-science-0478-data-representation-number-systems", name: "Number Systems", displayName: "Number Systems", pmtCode: "1.1" },
    { slug: "caie-computer-science-0478-data-representation-text-sound-images", name: "Text, Sound & Images", displayName: "Text, Sound & Images", pmtCode: "1.2" },
    { slug: "caie-computer-science-0478-data-representation-data-storage-compression", name: "Data Storage & Compression", displayName: "Data Storage & Compression", pmtCode: "1.3" },
  ],
  "data-transmission": [
    { slug: "caie-computer-science-0478-data-transmission-types-methods-data-transmission", name: "Types & Methods of Data Transmission", displayName: "Types & Methods of Data Transmission", pmtCode: "2.1" },
    { slug: "caie-computer-science-0478-data-transmission-error-detection", name: "Methods of Error Detection", displayName: "Methods of Error Detection", pmtCode: "2.2" },
    { slug: "caie-computer-science-0478-data-transmission-encryption", name: "Encryption", displayName: "Encryption", pmtCode: "2.3" },
  ],
  "hardware": [
    { slug: "caie-computer-science-0478-hardware-computer-architecture", name: "Computer Architecture", displayName: "Computer Architecture", pmtCode: "3.1" },
    { slug: "caie-computer-science-0478-hardware-input-output-devices", name: "Input & Output Devices", displayName: "Input & Output Devices", pmtCode: "3.2" },
    { slug: "caie-computer-science-0478-hardware-data-storage", name: "Data Storage", displayName: "Data Storage", pmtCode: "3.3" },
    { slug: "caie-computer-science-0478-hardware-network-hardware", name: "Network Hardware", displayName: "Network Hardware", pmtCode: "3.4" },
  ],
  "software": [
    { slug: "caie-computer-science-0478-software-types-software-interrupts", name: "Types of Software & Interrupts", displayName: "Types of Software & Interrupts", pmtCode: "4.1" },
    { slug: "caie-computer-science-0478-software-programming-languages-translators-ides", name: "Types of Programming Language, Translators & IDEs", displayName: "Types of Programming Language, Translators & IDEs", pmtCode: "4.2" },
  ],
  "the-internet-its-uses": [
    { slug: "caie-computer-science-0478-the-internet-its-uses-internet-www", name: "The Internet & the World Wide Web", displayName: "The Internet & the World Wide Web", pmtCode: "5.1" },
    { slug: "caie-computer-science-0478-the-internet-its-uses-digital-currency", name: "Digital Currency", displayName: "Digital Currency", pmtCode: "5.2" },
    { slug: "caie-computer-science-0478-the-internet-its-uses-cyber-security", name: "Cyber Security", displayName: "Cyber Security", pmtCode: "5.3" },
  ],
  "automated-emerging-technologies": [
    { slug: "caie-computer-science-0478-automated-emerging-technologies-automated-systems", name: "Automated Systems", displayName: "Automated Systems", pmtCode: "6.1" },
    { slug: "caie-computer-science-0478-automated-emerging-technologies-robotics", name: "Robotics", displayName: "Robotics", pmtCode: "6.2" },
    { slug: "caie-computer-science-0478-automated-emerging-technologies-artificial-intelligence", name: "Artificial Intelligence", displayName: "Artificial Intelligence", pmtCode: "6.3" },
  ],
  "algorithm-design-problem-solving": [
    { slug: "caie-computer-science-0478-algorithm-design-problem-solving-development-life-cycle", name: "Development Life Cycle", displayName: "Development Life Cycle", pmtCode: "7.1" },
    { slug: "caie-computer-science-0478-algorithm-design-problem-solving-computer-sub-systems", name: "Computer Sub-Systems", displayName: "Computer Sub-Systems", pmtCode: "7.2" },
    { slug: "caie-computer-science-0478-algorithm-design-problem-solving-algorithms", name: "Algorithms", displayName: "Algorithms", pmtCode: "7.3" },
    { slug: "caie-computer-science-0478-algorithm-design-problem-solving-standard-methods-solution", name: "Standard Methods of a Solution", displayName: "Standard Methods of a Solution", pmtCode: "7.4" },
    { slug: "caie-computer-science-0478-algorithm-design-problem-solving-validation-verification", name: "Validation & Verification", displayName: "Validation & Verification", pmtCode: "7.5" },
    { slug: "caie-computer-science-0478-algorithm-design-problem-solving-identifying-errors", name: "Identifying Errors", displayName: "Identifying Errors", pmtCode: "7.6" },
  ],
  "programming": [
    { slug: "caie-computer-science-0478-programming-programming-concepts", name: "Programming Concepts", displayName: "Programming Concepts", pmtCode: "8.1" },
    { slug: "caie-computer-science-0478-programming-arrays", name: "Arrays", displayName: "Arrays", pmtCode: "8.2" },
    { slug: "caie-computer-science-0478-programming-file-handling", name: "File Handling", displayName: "File Handling", pmtCode: "8.3" },
  ],
  "databases": [
    { slug: "caie-computer-science-0478-databases-databases", name: "Databases", displayName: "Databases", pmtCode: "9.1" },
    { slug: "caie-computer-science-0478-databases-sql", name: "SQL", displayName: "SQL", pmtCode: "9.2" },
  ],
  "boolean-logic": [
    { slug: "caie-computer-science-0478-boolean-logic-boolean-logic", name: "Boolean Logic", displayName: "Boolean Logic", pmtCode: "10.1" },
  ],
};

// Economics 0455
const ECONOMICS_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "1-the-basic-economic-problem": [
    { slug: "caie-economics-0455-1-the-basic-economic-problem-1-1-the-nature-of-the-basic-economic-problem", name: "The Nature of the Basic Economic Problem", displayName: "The Nature of the Basic Economic Problem", pmtCode: "1.1" },
    { slug: "caie-economics-0455-1-the-basic-economic-problem-1-2-factors-of-production", name: "Factors of Production", displayName: "Factors of Production", pmtCode: "1.2" },
    { slug: "caie-economics-0455-1-the-basic-economic-problem-1-3-opportunity-cost", name: "Opportunity Cost", displayName: "Opportunity Cost", pmtCode: "1.3" },
    { slug: "caie-economics-0455-1-the-basic-economic-problem-1-4-production-possibility-curve-ppc-diagrams", name: "Production Possibility Curve (PPC) Diagrams", displayName: "Production Possibility Curve (PPC) Diagrams", pmtCode: "1.4" },
  ],
  "2-the-allocation-of-resources": [
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-1-the-role-of-markets-in-allocating-resources", name: "The Role of Markets in Allocating Resources", displayName: "The Role of Markets in Allocating Resources", pmtCode: "2.1" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-10-mixed-economic-system", name: "Mixed Economic System", displayName: "Mixed Economic System", pmtCode: "2.10" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-2-demand", name: "Demand", displayName: "Demand", pmtCode: "2.2" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-3-supply", name: "Supply", displayName: "Supply", pmtCode: "2.3" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-4-price-determination", name: "Price Determination", displayName: "Price Determination", pmtCode: "2.4" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-5-price-changes", name: "Price Changes", displayName: "Price Changes", pmtCode: "2.5" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-6-price-elasticity-of-demand-ped", name: "Price Elasticity of Demand (PED)", displayName: "Price Elasticity of Demand (PED)", pmtCode: "2.6" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-7-price-elasticity-of-supply-pes", name: "Price Elasticity of Supply (PES)", displayName: "Price Elasticity of Supply (PES)", pmtCode: "2.7" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-8-market-economic-system", name: "Market Economic System", displayName: "Market Economic System", pmtCode: "2.8" },
    { slug: "caie-economics-0455-2-the-allocation-of-resources-2-9-market-failure", name: "Market Failure", displayName: "Market Failure", pmtCode: "2.9" },
  ],
  "3-microeconomic-decision-makers": [
    { slug: "caie-economics-0455-3-microeconomic-decision-makers-3-1-money-and-banking", name: "Money & Banking", displayName: "Money & Banking", pmtCode: "3.1" },
    { slug: "caie-economics-0455-3-microeconomic-decision-makers-3-2-households", name: "Households", displayName: "Households", pmtCode: "3.2" },
    { slug: "caie-economics-0455-3-microeconomic-decision-makers-3-3-workers", name: "Workers", displayName: "Workers", pmtCode: "3.3" },
    { slug: "caie-economics-0455-3-microeconomic-decision-makers-3-4-firms", name: "Firms", displayName: "Firms", pmtCode: "3.4" },
    { slug: "caie-economics-0455-3-microeconomic-decision-makers-3-5-firms-and-production", name: "Firms & Production", displayName: "Firms & Production", pmtCode: "3.5" },
    { slug: "caie-economics-0455-3-microeconomic-decision-makers-3-6-firms-costs-revenue-and-objectives", name: "Firms' Costs, Revenue & Objectives", displayName: "Firms' Costs, Revenue & Objectives", pmtCode: "3.6" },
    { slug: "caie-economics-0455-3-microeconomic-decision-makers-3-7-types-of-markets", name: "Types of Markets", displayName: "Types of Markets", pmtCode: "3.7" },
  ],
  "4-government-and-the-macroeconomy": [
    { slug: "caie-economics-0455-4-government-and-the-macroeconomy-4-1-government-macroeconomic-intervention", name: "Government Macroeconomic Intervention", displayName: "Government Macroeconomic Intervention", pmtCode: "4.1" },
    { slug: "caie-economics-0455-4-government-and-the-macroeconomy-4-2-fiscal-policy", name: "Fiscal Policy", displayName: "Fiscal Policy", pmtCode: "4.2" },
    { slug: "caie-economics-0455-4-government-and-the-macroeconomy-4-3-monetary-policy", name: "Monetary Policy", displayName: "Monetary Policy", pmtCode: "4.3" },
    { slug: "caie-economics-0455-4-government-and-the-macroeconomy-4-4-supply-side-policy", name: "Supply-Side Policy", displayName: "Supply-Side Policy", pmtCode: "4.4" },
    { slug: "caie-economics-0455-4-government-and-the-macroeconomy-4-5-economic-growth", name: "Economic Growth", displayName: "Economic Growth", pmtCode: "4.5" },
    { slug: "caie-economics-0455-4-government-and-the-macroeconomy-4-6-employment-and-unemployment", name: "Employment & Unemployment", displayName: "Employment & Unemployment", pmtCode: "4.6" },
    { slug: "caie-economics-0455-4-government-and-the-macroeconomy-4-7-inflation", name: "Inflation", displayName: "Inflation", pmtCode: "4.7" },
  ],
  "5-economic-development": [
    { slug: "caie-economics-0455-5-economic-development-5-1-living-standards", name: "Living Standards", displayName: "Living Standards", pmtCode: "5.1" },
    { slug: "caie-economics-0455-5-economic-development-5-2-poverty", name: "Poverty", displayName: "Poverty", pmtCode: "5.2" },
    { slug: "caie-economics-0455-5-economic-development-5-3-population", name: "Population", displayName: "Population", pmtCode: "5.3" },
    { slug: "caie-economics-0455-5-economic-development-5-4-differences-in-economic-development-between-countries", name: "Differences in Economic Development Between Countries", displayName: "Differences in Economic Development Between Countries", pmtCode: "5.4" },
  ],
  "6-international-trade-and-globalisation": [
    { slug: "caie-economics-0455-6-international-trade-and-globalisation-6-1-specialisation-and-free-trade", name: "Specialisation & Free Trade", displayName: "Specialisation & Free Trade", pmtCode: "6.1" },
    { slug: "caie-economics-0455-6-international-trade-and-globalisation-6-2-globalisation-and-trade-restrictions", name: "Globalisation & Trade Restrictions", displayName: "Globalisation & Trade Restrictions", pmtCode: "6.2" },
    { slug: "caie-economics-0455-6-international-trade-and-globalisation-6-3-foreign-exchange-rates", name: "Foreign Exchange Rates", displayName: "Foreign Exchange Rates", pmtCode: "6.3" },
    { slug: "caie-economics-0455-6-international-trade-and-globalisation-6-4-current-account-of-the-balance-of-payments", name: "Current Account of the Balance of Payments", displayName: "Current Account of the Balance of Payments", pmtCode: "6.4" },
  ],
};

// Additional Mathematics 0606
const ADDITIONAL_MATHS_SUBTOPICS: Record<string, SubtopicDef[]> = {
  "algebra-functions": [
    { slug: "functions", name: "Functions", displayName: "Functions", pmtCode: "1.1" },
    { slug: "quadratic-functions", name: "Quadratic Functions", displayName: "Quadratic Functions", pmtCode: "1.2" },
    { slug: "factors-of-polynomials", name: "Factors of Polynomials", displayName: "Factors of Polynomials", pmtCode: "1.3" },
    { slug: "equations-inequalities-and-graphs", name: "Equations, Inequalities & Graphs", displayName: "Equations, Inequalities & Graphs", pmtCode: "1.4" },
    { slug: "simultaneous-equations", name: "Simultaneous Equations", displayName: "Simultaneous Equations", pmtCode: "1.5" },
    { slug: "logarithmic-and-exponential-functions", name: "Logarithmic & Exponential Functions", displayName: "Logarithmic & Exponential Functions", pmtCode: "1.6" },
  ],
  "calculus": [
    { slug: "differentiation", name: "Differentiation", displayName: "Differentiation", pmtCode: "6.1" },
    { slug: "integration", name: "Integration", displayName: "Integration", pmtCode: "6.2" },
    { slug: "calculus-for-kinematics", name: "Calculus for Kinematics", displayName: "Calculus for Kinematics", pmtCode: "6.3" },
  ],
  "coordinate-geometry": [
    { slug: "straight-line-graphs", name: "Straight Line Graphs", displayName: "Straight Line Graphs", pmtCode: "2.1" },
    { slug: "coordinate-geometry-of-the-circle", name: "Coordinate Geometry of the Circle", displayName: "Coordinate Geometry of the Circle", pmtCode: "2.2" },
  ],
  "sequences-series": [
    { slug: "permutations-and-combinations", name: "Permutations & Combinations", displayName: "Permutations & Combinations", pmtCode: "4.1" },
    { slug: "binomial-theorem", name: "Binomial Theorem", displayName: "Binomial Theorem", pmtCode: "4.2" },
    { slug: "arithmetic-and-geometric-progressions", name: "Arithmetic & Geometric Progressions", displayName: "Arithmetic & Geometric Progressions", pmtCode: "4.3" },
  ],
  "trigonometry": [
    { slug: "circular-measure", name: "Circular Measure", displayName: "Circular Measure", pmtCode: "3.1" },
    { slug: "trigonometry", name: "Trigonometry", displayName: "Trigonometry", pmtCode: "3.2" },
  ],
  "vectors": [
    { slug: "vectors-in-two-dimensions", name: "Vectors in Two Dimensions", displayName: "Vectors in Two Dimensions", pmtCode: "5.1" },
  ],
};

export const SUBTOPIC_DATA: Record<string, Record<string, SubtopicDef[]>> = {
  physics: PHYSICS_SUBTOPICS,
  chemistry: CHEMISTRY_SUBTOPICS,
  biology: BIOLOGY_SUBTOPICS,
  mathematics: MATHEMATICS_SUBTOPICS,
  "computer-science": CS_SUBTOPICS,
  economics: ECONOMICS_SUBTOPICS,
  "additional-maths": ADDITIONAL_MATHS_SUBTOPICS,
};

export function getSubtopics(subjectKey: string, topicSlug: string): SubtopicDef[] {
  return SUBTOPIC_DATA[subjectKey]?.[topicSlug] || [];
}

export function getSubtopic(subjectKey: string, topicSlug: string, subtopicSlug: string): SubtopicDef | null {
  const list = getSubtopics(subjectKey, topicSlug);
  return list.find(s => s.slug === subtopicSlug) || null;
}
