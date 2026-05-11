// Static fallback content for when Supabase has no data
// Organized by subjectKey → topicSlug

export interface FallbackNote {
  title: string;
  content: string;
  is_free_preview: boolean;
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

interface FallbackData {
  notes: FallbackNote[];
  mcqs: FallbackMcq[];
  structured: FallbackStructured[];
}

// Physics 0625
const physicsData: Record<string, FallbackData> = {
  "motion-forces-energy": {
    notes: [
      {
        title: "1.1 Physical Quantities & Measurement",
        content: `## Physical Quantities

A **physical quantity** is a property of an object that can be measured.

### Scalar vs Vector

| Scalar | Vector |
|--------|--------|
| Magnitude only | Magnitude + direction |
| e.g. mass, time, speed, energy | e.g. velocity, force, acceleration |

### SI Base Units

| Quantity | Unit | Symbol |
|----------|------|--------|
| Length | metre | m |
| Mass | kilogram | kg |
| Time | second | s |
| Electric current | ampere | A |
| Temperature | kelvin | K |

### Measuring Instruments

- **Ruler**: accuracy ±1 mm
- **Vernier caliper**: accuracy ±0.1 mm  
- **Micrometer screw gauge**: accuracy ±0.01 mm
- **Stopwatch**: typical human error ±0.2 s`,
        is_free_preview: true,
      },
      {
        title: "1.2 Motion",
        content: `## Speed

$$v = \\frac{s}{t}$$

where:
- v = speed (m/s)
- s = distance (m)
- t = time (s)

## Acceleration

$$a = \\frac{\\Delta v}{t}$$

where:
- a = acceleration (m/s²)
- Δv = change in velocity (m/s)

## Distance-Time Graphs

- **Horizontal line** → stationary
- **Straight sloping line** → constant speed
- **Curved line** → acceleration or deceleration
- **Gradient = speed**

## Speed-Time Graphs

- **Horizontal line** → constant speed
- **Straight sloping line** → constant acceleration
- **Gradient = acceleration**
- **Area under graph = distance travelled**`,
        is_free_preview: true,
      },
      {
        title: "1.5 Forces",
        content: `## What is a Force?

A **force** is a push or pull that can:
- Change an object's speed
- Change an object's direction
- Change an object's shape

## Newton's Laws of Motion

**First Law (Inertia):** An object remains at rest or in uniform motion in a straight line unless acted upon by a resultant force.

**Second Law:** $$F = ma$$

where F = resultant force (N), m = mass (kg), a = acceleration (m/s²)

**Third Law:** When object A exerts a force on object B, object B exerts an equal and opposite force on object A.

## Types of Forces

- **Weight:** W = mg (always acts downwards)
- **Normal reaction:** perpendicular to the surface
- **Friction:** opposes motion between surfaces
- **Tension:** force in a string, rope, or cable
- **Air resistance / drag:** opposes motion through a fluid
- **Upthrust:** upward force on an object in a fluid

## Resultant Force

The single force that has the same effect as all forces acting on an object combined. If the resultant force is zero, the object is in equilibrium.`,
        is_free_preview: false,
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
        question_text: "The gradient of a distance-time graph represents:",
        options: ["A. Acceleration", "B. Distance", "C. Speed", "D. Time"],
        answer_text: "C",
        explanation: "Gradient = change in distance ÷ change in time = speed.",
        difficulty: "easy",
      },
      {
        question_text: "A car accelerates from rest to 20 m/s in 5 seconds. What is its acceleration?",
        options: ["A. 2 m/s²", "B. 4 m/s²", "C. 10 m/s²", "D. 100 m/s²"],
        answer_text: "B",
        explanation: "Using a = (v-u)/t = (20-0)/5 = 4 m/s²",
        difficulty: "medium",
      },
      {
        question_text: "On a distance-time graph, what does a horizontal line represent?",
        options: ["A. Constant speed", "B. Acceleration", "C. Stationary", "D. Deceleration"],
        answer_text: "C",
        explanation: "When the distance stays the same over time, the object is not moving.",
        difficulty: "easy",
      },
      {
        question_text: "An object of mass 5 kg experiences a resultant force of 20 N. What is its acceleration?",
        options: ["A. 0.25 m/s²", "B. 4 m/s²", "C. 100 m/s²", "D. 15 m/s²"],
        answer_text: "B",
        explanation: "Using F = ma: a = F/m = 20/5 = 4 m/s²",
        difficulty: "medium",
      },
    ],
    structured: [
      {
        question_text: "A student drops a ball from a height of 20 m.\n\n(a) Calculate the time taken for the ball to reach the ground. (Take g = 10 m/s²)\n\n(b) Calculate the velocity of the ball just before it hits the ground.\n\n(c) State one assumption made in your calculations.",
        answer_text: "**(a)** Using s = ut + ½at²:\n20 = 0 + ½(10)t²\n20 = 5t²\nt² = 4\nt = 2.0 s\n\n**(b)** Using v = u + at:\nv = 0 + (10)(2.0)\nv = 20 m/s\n\n**(c)** Assume no air resistance / object falls freely under gravity only / acceleration due to gravity is constant.",
        difficulty: "medium",
        marks: 6,
      },
      {
        question_text: "A car of mass 1200 kg accelerates uniformly from 10 m/s to 30 m/s in 8.0 s.\n\n(a) Calculate the acceleration of the car.\n\n(b) Calculate the resultant force acting on the car.\n\n(c) The car then applies its brakes and stops in 4.0 s. Calculate the braking force.",
        answer_text: "**(a)** a = (v - u) / t\na = (30 - 10) / 8.0\na = 2.5 m/s²\n\n**(b)** F = ma\nF = 1200 × 2.5\nF = 3000 N\n\n**(c)** Deceleration:\na = (0 - 30) / 4.0 = -7.5 m/s²\nBraking force: F = 1200 × (-7.5) = -9000 N\nMagnitude = 9000 N",
        difficulty: "hard",
        marks: 6,
      },
    ],
  },
  "thermal-physics": {
    notes: [
      {
        title: "2.1 Kinetic Particle Model of Matter",
        content: `## States of Matter

| Property | Solid | Liquid | Gas |
|----------|-------|--------|-----|
| Shape | Fixed | Takes container shape | Fills container |
| Volume | Fixed | Fixed | Fills container |
| Particle arrangement | Regular, close | Irregular, close | Random, far apart |
| Particle motion | Vibrate in fixed positions | Slide past each other | Move rapidly in all directions |

## Brownian Motion

Random, erratic motion of particles suspended in a fluid (liquid or gas), caused by collisions with fast-moving molecules of the fluid. This provides evidence for the kinetic particle model.

## Gas Pressure

Gas pressure is caused by particles colliding with the walls of the container.

**Effect of temperature:** As temperature increases, particles move faster → more frequent and harder collisions → higher pressure (at constant volume).

**Effect of volume:** As volume decreases, particles hit the walls more frequently → higher pressure (at constant temperature).

## Boyle's Law

For a fixed mass of gas at constant temperature:

$$p_1 V_1 = p_2 V_2$$

Pressure is inversely proportional to volume.`,
        is_free_preview: true,
      },
    ],
    mcqs: [
      {
        question_text: "Which state of matter has a fixed volume but takes the shape of its container?",
        options: ["A. Solid", "B. Liquid", "C. Gas", "D. Plasma"],
        answer_text: "B",
        explanation: "Liquids have fixed volume (incompressible) but no fixed shape — they flow to take the shape of their container.",
        difficulty: "easy",
      },
      {
        question_text: "What happens to the pressure of a gas if its temperature increases at constant volume?",
        options: ["A. Decreases", "B. Stays the same", "C. Increases", "D. Becomes zero"],
        answer_text: "C",
        explanation: "Higher temperature → particles move faster → more frequent and energetic collisions with walls → higher pressure.",
        difficulty: "easy",
      },
    ],
    structured: [],
  },
};

export const FALLBACK_DATA: Record<string, Record<string, FallbackData>> = {
  physics: physicsData,
  // chemistry, biology, mathematics can be added later
};
