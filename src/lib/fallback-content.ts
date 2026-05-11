// Static fallback content for when Supabase has no data
// Organized by subjectKey → topicSlug → subtopicSlug

export interface FallbackNote {
  title: string;
  content: string;
  is_free_preview: boolean;
  source?: string;     // e.g. "PMT", "SME"
  file_name?: string;
  file_url?: string;
}

export interface FallbackMcq {
  question_text: string;
  options: string[];
  answer_text: string;
  explanation: string;
  difficulty: string;
}

export interface FallbackStructured {
  question_text: string;
  answer_text: string;
  difficulty: string;
  marks: number;
}

export interface FallbackSubtopicData {
  notes: FallbackNote[];
  mcqs: FallbackMcq[];
  structured: FallbackStructured[];
}

// ============================================================
// Physics 0625
// ============================================================
const physicsData: Record<string, Record<string, FallbackSubtopicData>> = {
  "motion-forces-energy": {
    // 1.1 Physical Quantities & Measurement
    "measurement": {
      notes: [
        {
          title: "Physical Quantities & Measurement Techniques",
          content: `## Physical Quantities\n\nA **physical quantity** is a property of an object that can be measured with a measuring instrument.\n\n### Scalar vs Vector\n\n| Scalar | Vector |\n|--------|--------|\n| Magnitude only | Magnitude + direction |\n| e.g. mass, time, speed, energy | e.g. velocity, force, acceleration |\n| Added like numbers | Added using vector rules |\n\n### SI Base Units\n\n| Quantity | Unit | Symbol |\n|----------|------|--------|\n| Length | metre | m |\n| Mass | kilogram | kg |\n| Time | second | s |\n| Electric current | ampere | A |\n| Temperature | kelvin | K |\n| Amount of substance | mole | mol |\n\n### Measuring Length\n\n- **Ruler / metre rule**: accuracy ±1 mm\n- **Vernier caliper**: accuracy ±0.1 mm (0.01 cm)\n- **Micrometer screw gauge**: accuracy ±0.01 mm (0.001 cm)\n\n### Measuring Time\n\n- **Stopwatch**: typical human reaction time error ±0.2 s\n- For higher accuracy: measure time for multiple oscillations and divide by the number of oscillations`,
          is_free_preview: true,
          source: "PMT",
          file_name: "1.1 Physical Quantities & Measurement.pdf",
        },
      ],
      mcqs: [
        {
          question_text: "Which of the following is a scalar quantity?",
          options: ["A. Velocity", "B. Force", "C. Speed", "D. Acceleration"],
          answer_text: "C",
          explanation: "Speed has magnitude only. Velocity, force, and acceleration all have direction, making them vectors.",
          difficulty: "easy",
        },
        {
          question_text: "Which instrument has the highest precision for measuring length?",
          options: ["A. Metre ruler", "B. Vernier caliper", "C. Micrometer screw gauge", "D. Measuring tape"],
          answer_text: "C",
          explanation: "Micrometer: ±0.01 mm. Vernier: ±0.1 mm. Ruler: ±1 mm.",
          difficulty: "easy",
        },
      ],
      structured: [
        {
          question_text: "A student uses a vernier caliper to measure the diameter of a cylinder.\n\n(a) Describe how to read the measurement from the vernier caliper.\n(b) The student takes five readings: 12.3, 12.4, 12.3, 12.5, 12.4 mm.\nCalculate the average diameter.\n(c) Explain why taking multiple readings improves accuracy.",
          answer_text: "(a) Read the main scale just before the vernier zero mark. Find which vernier division aligns with a main scale division. Total = main scale + (vernier × 0.01) cm.\n\n(b) Average = (12.3 + 12.4 + 12.3 + 12.5 + 12.4) / 5 = 12.38 mm ≈ 12.4 mm\n\n(c) Multiple readings reduce random error. Averaging gives a value closer to the true value. It also helps identify anomalous readings.",
          difficulty: "medium",
          marks: 5,
        },
      ],
    },
    // 1.2 Motion
    "motion": {
      notes: [
        {
          title: "Motion — Speed, Velocity & Acceleration",
          content: `## Speed\n\n$$v = \\frac{s}{t}$$\n\nwhere:\n- v = speed (m/s)\n- s = distance (m)\n- t = time (s)\n\nAverage speed = total distance / total time\n\nInstantaneous speed = speed at a specific moment\n\n## Acceleration\n\n$$a = \\frac{\\Delta v}{t} = \\frac{v - u}{t}$$\n\nwhere:\n- a = acceleration (m/s²)\n- v = final velocity (m/s)\n- u = initial velocity (m/s)\n- t = time (s)\n\nPositive acceleration = speeding up\nNegative acceleration (deceleration) = slowing down\n\n## Distance-Time Graphs\n\n| Shape | Meaning |\n|-------|---------|\n| Horizontal line | Stationary |\n| Straight sloping line | Constant speed |\n| Steeper slope | Higher speed |\n| Curved line | Acceleration/deceleration |\n\n**Gradient of distance-time graph = speed**\n\n## Speed-Time Graphs\n\n| Shape | Meaning |\n|-------|---------|\n| Horizontal line | Constant speed |\n| Straight sloping line | Constant acceleration |\n| Line along x-axis | Stationary |\n\n**Gradient = acceleration**\n**Area under graph = distance travelled**`,
          is_free_preview: true,
          source: "PMT",
          file_name: "1.2 Motion.pdf",
        },
      ],
      mcqs: [
        {
          question_text: "A car accelerates from rest to 20 m/s in 5 seconds. What is its acceleration?",
          options: ["A. 2 m/s²", "B. 4 m/s²", "C. 10 m/s²", "D. 100 m/s²"],
          answer_text: "B",
          explanation: "a = (v - u) / t = (20 - 0) / 5 = 4 m/s²",
          difficulty: "medium",
        },
        {
          question_text: "The gradient of a distance-time graph represents:",
          options: ["A. Acceleration", "B. Distance", "C. Speed", "D. Time"],
          answer_text: "C",
          explanation: "Gradient = change in distance / change in time = speed.",
          difficulty: "easy",
        },
        {
          question_text: "The area under a speed-time graph represents:",
          options: ["A. Acceleration", "B. Speed", "C. Distance travelled", "D. Force"],
          answer_text: "C",
          explanation: "Area = speed × time = distance travelled. Gradient = acceleration.",
          difficulty: "medium",
        },
      ],
      structured: [
        {
          question_text: "A train travels at a constant speed of 30 m/s for 60 seconds, then decelerates uniformly and stops in 20 seconds.\n\n(a) Sketch the speed-time graph for this journey.\n(b) Calculate the total distance travelled.\n(c) Calculate the deceleration of the train.",
          answer_text: "(a) Horizontal line at 30 m/s from t=0 to t=60, then straight line down to 0 m/s at t=80.\n\n(b) Distance = area under graph\n= (30 × 60) + (½ × 20 × 30)\n= 1800 + 300 = 2100 m\n\n(c) a = (v-u)/t = (0-30)/20 = -1.5 m/s²\nDeceleration = 1.5 m/s²",
          difficulty: "medium",
          marks: 6,
        },
      ],
    },
    // 1.3 Mass & Weight
    "mass-weight": {
      notes: [
        {
          title: "Mass & Weight",
          content: `## Mass vs Weight\n\n| Mass | Weight |\n|------|--------|\n| Amount of matter in an object | Force of gravity on an object |\n| Measured in kilograms (kg) | Measured in newtons (N) |\n| Scalar quantity | Vector quantity |\n| Same everywhere in the universe | Depends on gravitational field strength |\n| Measured with a balance | Measured with a spring balance / newton meter |\n\n## Weight Formula\n\n$$W = mg$$\n\nwhere:\n- W = weight (N)\n- m = mass (kg)\n- g = gravitational field strength (N/kg)\n\nOn Earth: g ≈ 9.8 N/kg (often rounded to 10 N/kg in IGCSE)\nOn the Moon: g ≈ 1.6 N/kg\n\n## Gravitational Field Strength\n\nThe gravitational field strength (g) is the force per unit mass acting on an object.\n\n$$g = \\frac{W}{m}$$\n\nAn object's mass stays the same on Earth and the Moon, but its weight is about 6 times less on the Moon because g is about 6 times smaller.`,
          is_free_preview: true,
          source: "PMT",
          file_name: "1.3 Mass & Weight.pdf",
        },
      ],
      mcqs: [
        {
          question_text: "An object has mass 5 kg on Earth. What is its weight? (g = 10 N/kg)",
          options: ["A. 0.5 N", "B. 5 N", "C. 50 N", "D. 500 N"],
          answer_text: "C",
          explanation: "W = mg = 5 × 10 = 50 N",
          difficulty: "easy",
        },
        {
          question_text: "When an astronaut goes to the Moon, which quantity changes?",
          options: ["A. Mass only", "B. Weight only", "C. Both mass and weight", "D. Neither"],
          answer_text: "B",
          explanation: "Mass is constant everywhere. Weight depends on g, which is lower on the Moon.",
          difficulty: "easy",
        },
      ],
      structured: [],
    },
    // 1.5 Forces
    "forces": {
      notes: [
        {
          title: "Forces — Newton's Laws & Types of Forces",
          content: `## What is a Force?\n\nA **force** is a push or pull that can change an object's speed, direction, or shape.\n\n## Newton's Laws of Motion\n\n### First Law (Law of Inertia)\n\nAn object remains at rest, or continues to move at constant velocity, unless acted upon by a resultant force.\n\nIf resultant force = 0:\n- Object at rest stays at rest\n- Object moving continues at constant speed in a straight line\n\n### Second Law\n\n$$F = ma$$\n\nResultant force = mass × acceleration\n\nThe acceleration is in the same direction as the resultant force.\n\n### Third Law\n\nWhen object A exerts a force on object B, object B exerts an equal and opposite force on object A.\n\nThese forces:\n- Are equal in magnitude\n- Are opposite in direction\n- Act on different objects\n\n## Types of Forces\n\n- **Weight (W)**: W = mg, always acts downwards\n- **Normal reaction**: perpendicular to the surface\n- **Friction**: opposes motion between surfaces in contact\n- **Tension**: force exerted by a string, rope, or cable\n- **Air resistance / drag**: opposes motion through air or fluid\n- **Upthrust / buoyancy**: upward force on object in fluid\n- **Magnetic force**: between magnets or magnetic materials\n- **Electrostatic force**: between charged objects`,
          is_free_preview: false,
          source: "PMT",
          file_name: "1.5 Forces — Newton's Laws.pdf",
        },
      ],
      mcqs: [
        {
          question_text: "An object of mass 5 kg experiences a resultant force of 20 N. What is its acceleration?",
          options: ["A. 0.25 m/s²", "B. 4 m/s²", "C. 100 m/s²", "D. 15 m/s²"],
          answer_text: "B",
          explanation: "a = F / m = 20 / 5 = 4 m/s²",
          difficulty: "medium",
        },
      ],
      structured: [
        {
          question_text: "A car of mass 1200 kg accelerates uniformly from 10 m/s to 30 m/s in 8.0 s.\n\n(a) Calculate the acceleration of the car.\n(b) Calculate the resultant force acting on the car.\n(c) The car then applies brakes and stops in 4.0 s. Calculate the braking force.",
          answer_text: "(a) a = (v - u) / t = (30 - 10) / 8.0 = 2.5 m/s²\n\n(b) F = ma = 1200 × 2.5 = 3000 N\n\n(c) Deceleration: a = (0 - 30) / 4.0 = -7.5 m/s²\nBraking force: F = 1200 × (-7.5) = -9000 N\nMagnitude = 9000 N opposite to motion",
          difficulty: "hard",
          marks: 6,
        },
      ],
    },
  },
  "thermal-physics": {
    // 2.1 Kinetic Particle Model
    "kinetic-model": {
      notes: [
        {
          title: "Kinetic Particle Model of Matter",
          content: `## States of Matter\n\n| Property | Solid | Liquid | Gas |\n|----------|-------|--------|-----|\n| Shape | Fixed | Takes container shape | Fills container |\n| Volume | Fixed | Fixed | Fills container |\n| Particle arrangement | Regular, close | Irregular, close | Random, far apart |\n| Particle motion | Vibrate in fixed positions | Slide past each other | Move rapidly in all directions |\n| Density | High | Medium-high | Low |\n\n## Brownian Motion\n\nRandom, erratic motion of particles (e.g. smoke particles in air) caused by collisions with fast-moving, invisible air molecules.\n\nEvidence for:\n- Matter is made of tiny particles\n- Particles are in constant random motion\n\n## Gas Pressure\n\nCaused by particles colliding with container walls.\n\n- **Higher temperature** → faster particles → more frequent & harder collisions → **higher pressure**\n- **Smaller volume** → particles hit walls more often → **higher pressure**\n\n## Boyle's Law\n\nFor a fixed mass of gas at constant temperature:\n\n$$p_1 V_1 = p_2 V_2$$\n\nPressure is inversely proportional to volume.\n\np ∝ 1/V (at constant temperature)`,
          is_free_preview: true,
          source: "PMT",
          file_name: "2.1 Kinetic Particle Model.pdf",
        },
      ],
      mcqs: [
        {
          question_text: "Which state of matter has a fixed volume but takes the shape of its container?",
          options: ["A. Solid", "B. Liquid", "C. Gas", "D. Plasma"],
          answer_text: "B",
          explanation: "Liquids: fixed volume (incompressible), no fixed shape.",
          difficulty: "easy",
        },
        {
          question_text: "If the volume of a fixed mass of gas at constant temperature is halved, what happens to its pressure?",
          options: ["A. It stays the same", "B. It halves", "C. It doubles", "D. It becomes zero"],
          answer_text: "C",
          explanation: "p₁V₁ = p₂V₂. When V₂ = V₁/2, then p₂ = 2p₁ (pressure doubles).",
          difficulty: "medium",
        },
      ],
      structured: [],
    },
  },
};

export const FALLBACK_DATA: Record<string, Record<string, Record<string, FallbackSubtopicData>>> = {
  physics: physicsData,
};
