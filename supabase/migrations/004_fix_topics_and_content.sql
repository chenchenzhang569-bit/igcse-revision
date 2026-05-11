-- ============================================================
-- 004: Fix topic slugs + seed subtopics + sample content
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. CAIE Physics 0625 — update topic slugs to match static data
UPDATE topics SET slug = 'motion-forces-energy' WHERE slug = 'general-physics';
UPDATE topics SET slug = 'waves' WHERE slug = 'properties-of-waves';
UPDATE topics SET slug = 'electricity-magnetism' WHERE slug = 'electricity-and-magnetism';
UPDATE topics SET slug = 'nuclear-physics' WHERE slug = 'atomic-physics';

-- Insert missing Physics topics
DO $$
DECLARE
  phys_id UUID;
BEGIN
  SELECT id INTO phys_id FROM subjects WHERE slug='caie-physics-0625';
  INSERT INTO topics (subject_id, name, display_name, slug, sort_order) VALUES
    (phys_id, 'Space Physics', 'Space Physics', 'space-physics', 6)
  ON CONFLICT DO NOTHING;
END $$;

-- 2. CAIE Chemistry 0620 — add missing topics
DO $$
DECLARE
  chem_id UUID;
BEGIN
  SELECT id INTO chem_id FROM subjects WHERE slug='caie-chemistry-0620';
  INSERT INTO topics (subject_id, name, display_name, slug, sort_order) VALUES
    (chem_id, 'Chemistry of the Environment', 'Chemistry of the Environment', 'chemistry-environment', 11),
    (chem_id, 'Experimental Techniques', 'Experimental Techniques', 'experimental-techniques', 12)
  ON CONFLICT DO NOTHING;
  -- Fix "the-periodic-table" → "periodic-table"
  UPDATE topics SET slug = 'periodic-table' WHERE slug = 'the-periodic-table' AND subject_id = chem_id;
END $$;

-- 3. CAIE Biology 0610 — ensure topics exist
DO $$
DECLARE
  bio_id UUID;
BEGIN
  SELECT id INTO bio_id FROM subjects WHERE slug='caie-biology-0610';
  -- Set is_published=true so it shows up
  UPDATE subjects SET is_published = true WHERE slug='caie-biology-0610';
  
  INSERT INTO topics (subject_id, name, display_name, slug, sort_order) VALUES
    (bio_id, 'Characteristics of Living Organisms', 'Characteristics of Living Organisms', 'characteristics-living-organisms', 1),
    (bio_id, 'Organisation of the Organism', 'Organisation of the Organism', 'organisation-organism', 2),
    (bio_id, 'Movement In & Out of Cells', 'Movement In & Out of Cells', 'movement-cells', 3),
    (bio_id, 'Biological Molecules', 'Biological Molecules', 'biological-molecules', 4),
    (bio_id, 'Enzymes', 'Enzymes', 'enzymes', 5),
    (bio_id, 'Plant Nutrition', 'Plant Nutrition', 'plant-nutrition', 6),
    (bio_id, 'Human Nutrition', 'Human Nutrition', 'human-nutrition', 7),
    (bio_id, 'Transport in Plants', 'Transport in Plants', 'transport-plants', 8),
    (bio_id, 'Transport in Animals', 'Transport in Animals', 'transport-animals', 9),
    (bio_id, 'Diseases & Immunity', 'Diseases & Immunity', 'diseases-immunity', 10),
    (bio_id, 'Gas Exchange in Humans', 'Gas Exchange in Humans', 'gas-exchange-humans', 11),
    (bio_id, 'Respiration', 'Respiration', 'respiration', 12),
    (bio_id, 'Excretion in Humans', 'Excretion in Humans', 'excretion-humans', 13),
    (bio_id, 'Coordination & Response', 'Coordination & Response', 'coordination-response', 14),
    (bio_id, 'Drugs', 'Drugs', 'drugs', 15),
    (bio_id, 'Reproduction', 'Reproduction', 'reproduction', 16),
    (bio_id, 'Inheritance', 'Inheritance', 'inheritance', 17),
    (bio_id, 'Variation & Selection', 'Variation & Selection', 'variation-selection', 18),
    (bio_id, 'Organisms & Their Environment', 'Organisms & Their Environment', 'organisms-environment', 19),
    (bio_id, 'Human Influences on Ecosystems', 'Human Influences on Ecosystems', 'human-influences-ecosystems', 20),
    (bio_id, 'Biotechnology & Genetic Modification', 'Biotechnology & Genetic Modification', 'biotechnology', 21)
  ON CONFLICT DO NOTHING;
END $$;

-- 4. CAIE Mathematics 0580 — fix topics
DO $$
DECLARE
  math_id UUID;
BEGIN
  SELECT id INTO math_id FROM subjects WHERE slug='caie-mathematics-0580';
  -- Set is_published=true
  UPDATE subjects SET is_published = true WHERE slug='caie-mathematics-0580';
  
  -- Fix slugs: "algebra-and-graphs" → "algebra-graphs", "vectors-and-transformations" → "vectors-transformations"
  UPDATE topics SET slug = 'algebra-graphs' WHERE slug = 'algebra-and-graphs' AND subject_id = math_id;
  UPDATE topics SET slug = 'vectors-transformations' WHERE slug = 'vectors-and-transformations' AND subject_id = math_id;
END $$;

-- ============================================================
-- 5. Seed sample Notes (Physics 0625, topic: motion-forces-energy)
-- ============================================================
DO $$
DECLARE
  phys_id UUID;
  topic_id UUID;
BEGIN
  SELECT id INTO phys_id FROM subjects WHERE slug='caie-physics-0625';
  SELECT id INTO topic_id FROM topics WHERE subject_id = phys_id AND slug = 'motion-forces-energy';

  INSERT INTO notes (topic_id, title, content, sort_order, is_free_preview) VALUES
    (topic_id, '1.1 Physical Quantities & Measurement', 
     E'## Physical Quantities\n\nA **physical quantity** is a property of an object that can be measured with a measuring instrument.\n\n### Scalar vs Vector\n\n| Scalar | Vector |\n|--------|--------|\n| Magnitude only | Magnitude + direction |\n| e.g. mass, time, speed, energy | e.g. velocity, force, acceleration |\n\n### SI Base Units\n\n| Quantity | Unit | Symbol |\n|----------|------|--------|\n| Length | metre | m |\n| Mass | kilogram | kg |\n| Time | second | s |\n| Current | ampere | A |\n| Temperature | kelvin | K |\n\n### Measuring Length\n\n- **Ruler**: accuracy ±1 mm\n- **Vernier caliper**: accuracy ±0.1 mm\n- **Micrometer**: accuracy ±0.01 mm\n\n### Measuring Time\n\n- Stopwatch: typical reaction time error ±0.2 s\n- Pendulum: measure time for multiple oscillations, then divide', 
    1, true),

    (topic_id, '1.2 Motion', 
     E'## Motion\n\n### Speed\n$$v = \\frac{s}{t}$$\nwhere:\n- v = speed (m/s)\n- s = distance (m)\n- t = time (s)\n\n### Acceleration\n$$a = \\frac{\\Delta v}{t}$$\nwhere:\n- a = acceleration (m/s²)\n- Δv = change in velocity (m/s)\n- t = time (s)\n\n### Distance-Time Graphs\n\n- **Horizontal line** → stationary\n- **Straight sloping line** → constant speed\n- **Curved line** → acceleration/deceleration\n- Gradient = speed\n\n### Speed-Time Graphs\n\n- **Horizontal line** → constant speed\n- **Straight sloping line** → constant acceleration\n- Gradient = acceleration\n- Area under graph = distance travelled',
    2, true),

    (topic_id, '1.5 Forces',
     E'## Forces\n\nA **force** is a push or pull that can change an object''s:\n- Speed\n- Direction\n- Shape\n\n### Newton''s Laws\n\n**First Law**: An object remains at rest or in uniform motion unless acted upon by a resultant force.\n\n**Second Law**: $$F = ma$$\nwhere F = resultant force (N), m = mass (kg), a = acceleration (m/s²)\n\n**Third Law**: When object A exerts a force on object B, object B exerts an equal and opposite force on object A.\n\n### Types of Forces\n\n- **Weight**: W = mg (downwards)\n- **Normal reaction**: perpendicular to surface\n- **Friction**: opposes motion\n- **Tension**: in strings/ropes\n- **Air resistance / drag**: opposes motion through fluid',
    3, false)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- 6. Seed sample MCQ Questions (Physics 0625, motion-forces-energy)
-- ============================================================
DO $$
DECLARE
  phys_id UUID;
  topic_id UUID;
BEGIN
  SELECT id INTO phys_id FROM subjects WHERE slug='caie-physics-0625';
  SELECT id INTO topic_id FROM topics WHERE subject_id = phys_id AND slug = 'motion-forces-energy';

  INSERT INTO questions (subject_id, topic_id, question_type, question_text, options, correct_answer, explanation, difficulty, marks, sort_order) VALUES
    (phys_id, topic_id, 'mcq',
     'Which of the following is a scalar quantity?',
     '["A. Velocity", "B. Force", "C. Speed", "D. Acceleration"]',
     'C',
     'Speed is a scalar because it has magnitude only. Velocity, force, and acceleration all have direction, making them vectors.',
     'easy', 1, 1),

    (phys_id, topic_id, 'mcq',
     'A car accelerates from rest to 20 m/s in 5 seconds. What is its acceleration?',
     '["A. 2 m/s²", "B. 4 m/s²", "C. 10 m/s²", "D. 100 m/s²"]',
     'B',
     'Using a = (v-u)/t = (20-0)/5 = 4 m/s²',
     'medium', 1, 2),

    (phys_id, topic_id, 'mcq',
     'An object of mass 5 kg is acted upon by a resultant force of 20 N. What is its acceleration?',
     '["A. 0.25 m/s²", "B. 4 m/s²", "C. 100 m/s²", "D. 15 m/s²"]',
     'B',
     'Using F = ma: a = F/m = 20/5 = 4 m/s²',
     'medium', 1, 3),

    (phys_id, topic_id, 'mcq',
     'On a distance-time graph, what does a horizontal line represent?',
     '["A. Constant speed", "B. Acceleration", "C. Stationary", "D. Deceleration"]',
     'C',
     'When the distance stays the same over time, the object is not moving (stationary).',
     'easy', 1, 4),

    (phys_id, topic_id, 'mcq',
     'The area under a speed-time graph represents:',
     '["A. Acceleration", "B. Speed", "C. Distance travelled", "D. Force"]',
     'C',
     'Area under speed-time graph = distance travelled. Gradient = acceleration.',
     'medium', 1, 5)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- 7. Seed sample Structured Questions (Physics 0625)
-- ============================================================
DO $$
DECLARE
  phys_id UUID;
  topic_id UUID;
BEGIN
  SELECT id INTO phys_id FROM subjects WHERE slug='caie-physics-0625';
  SELECT id INTO topic_id FROM topics WHERE subject_id = phys_id AND slug = 'motion-forces-energy';

  INSERT INTO questions (subject_id, topic_id, question_type, question_text, answer_text, difficulty, marks, sort_order) VALUES
    (phys_id, topic_id, 'structured',
     'A student drops a ball from a height of 20 m.\n\n(a) Calculate the time taken for the ball to reach the ground. (g = 10 m/s²)\n(b) Calculate the velocity of the ball just before it hits the ground.\n(c) State one assumption made in your calculations.',
     '(a) Using s = ut + ½at²: 20 = 0 + ½(10)t² → t² = 4 → t = 2.0 s\n(b) v = u + at = 0 + 10(2) = 20 m/s\n(c) Assume no air resistance / assume object falls freely under gravity only.',
     'medium', 6, 1),

    (phys_id, topic_id, 'structured',
     'A car of mass 1200 kg accelerates uniformly from 10 m/s to 30 m/s in 8.0 s.\n\n(a) Calculate the acceleration of the car.\n(b) Calculate the resultant force acting on the car.\n(c) The car then brakes and stops in 4.0 s. Calculate the braking force.',
     '(a) a = (v-u)/t = (30-10)/8.0 = 2.5 m/s²\n(b) F = ma = 1200 × 2.5 = 3000 N\n(c) a = (0-30)/4.0 = -7.5 m/s², F = 1200 × (-7.5) = -9000 N (magnitude 9000 N)',
     'hard', 6, 2)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- 8. Physics thermal-physics sample data
-- ============================================================
DO $$
DECLARE
  phys_id UUID;
  topic_id UUID;
BEGIN
  SELECT id INTO phys_id FROM subjects WHERE slug='caie-physics-0625';
  SELECT id INTO topic_id FROM topics WHERE subject_id = phys_id AND slug = 'thermal-physics';

  INSERT INTO notes (topic_id, title, content, sort_order, is_free_preview) VALUES
    (topic_id, '2.1 Kinetic Particle Model', 
     E'## Kinetic Particle Model of Matter\n\n### States of Matter\n\n| Property | Solid | Liquid | Gas |\n|----------|-------|--------|-----|\n| Shape | Fixed | Takes container shape | Fills container |\n| Volume | Fixed | Fixed | Fills container |\n| Particle arrangement | Regular, close | Irregular, close | Random, far apart |\n| Particle motion | Vibrate in place | Slide past each other | Move rapidly |\n\n### Brownian Motion\n\nRandom motion of particles suspended in a fluid, caused by collisions with fast-moving fluid molecules.\n\n### Pressure in Gases\n\nGas pressure is caused by particles colliding with container walls.\n\nIncreasing temperature → particles move faster → more frequent & harder collisions → higher pressure.',
    1, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO questions (subject_id, topic_id, question_type, question_text, options, correct_answer, difficulty, marks, sort_order) VALUES
    (phys_id, topic_id, 'mcq',
     'Which state of matter has a fixed volume but no fixed shape?',
     '["A. Solid", "B. Liquid", "C. Gas", "D. Plasma"]',
     'B', 'easy', 1, 1),
    (phys_id, topic_id, 'mcq',
     'What happens to gas pressure when temperature increases at constant volume?',
     '["A. Decreases", "B. Stays the same", "C. Increases", "D. Becomes zero"]',
     'C', 'easy', 1, 2)
  ON CONFLICT DO NOTHING;
END $$;

-- Done!
