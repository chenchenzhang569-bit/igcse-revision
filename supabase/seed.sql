-- ============================================================
-- Seed Data: Exam Boards + Initial Subjects
-- Run AFTER 001_schema.sql
-- ============================================================

-- 考试局
INSERT INTO exam_boards (name, full_name, slug) VALUES
  ('CAIE', 'Cambridge Assessment International Education', 'caie'),
  ('Edexcel', 'Pearson Edexcel International', 'edexcel');

-- CAIE 科目 (MVP: 数学、物理、化学)
INSERT INTO subjects (exam_board_id, name, display_name, code, slug, icon, price_cny, is_published, sort_order) VALUES
  ((SELECT id FROM exam_boards WHERE slug='caie'), 'Mathematics', '数学', '0580', 'caie-mathematics-0580', '📐', 29900, true, 1),
  ((SELECT id FROM exam_boards WHERE slug='caie'), 'Physics', '物理', '0625', 'caie-physics-0625', '⚛️', 29900, true, 2),
  ((SELECT id FROM exam_boards WHERE slug='caie'), 'Chemistry', '化学', '0620', 'caie-chemistry-0620', '🧪', 29900, true, 3),
  ((SELECT id FROM exam_boards WHERE slug='caie'), 'Biology', '生物', '0610', 'caie-biology-0610', '🧬', 29900, false, 4),
  ((SELECT id FROM exam_boards WHERE slug='caie'), 'Additional Mathematics', '附加数学', '0606', 'caie-additional-mathematics-0606', '🔢', 29900, false, 5),
  ((SELECT id FROM exam_boards WHERE slug='caie'), 'Economics', '经济学', '0455', 'caie-economics-0455', '📈', 29900, false, 6),
  ((SELECT id FROM exam_boards WHERE slug='caie'), 'Computer Science', '计算机科学', '0478', 'caie-computer-science-0478', '💻', 29900, false, 7);

-- Edexcel 科目
INSERT INTO subjects (exam_board_id, name, display_name, code, slug, icon, price_cny, is_published, sort_order) VALUES
  ((SELECT id FROM exam_boards WHERE slug='edexcel'), 'Mathematics A', '数学A', '4MA1', 'edexcel-mathematics-a-4ma1', '📐', 29900, false, 1),
  ((SELECT id FROM exam_boards WHERE slug='edexcel'), 'Physics', '物理', '4PH1', 'edexcel-physics-4ph1', '⚛️', 29900, false, 2),
  ((SELECT id FROM exam_boards WHERE slug='edexcel'), 'Chemistry', '化学', '4CH1', 'edexcel-chemistry-4ch1', '🧪', 29900, false, 3);

-- CAIE Math (0580) 主题
DO $$
DECLARE
  math_id UUID;
BEGIN
  SELECT id INTO math_id FROM subjects WHERE slug='caie-mathematics-0580';

  INSERT INTO topics (subject_id, name, display_name, slug, sort_order) VALUES
    (math_id, 'Number', '数与数系', 'number', 1),
    (math_id, 'Algebra & Graphs', '代数与图像', 'algebra-and-graphs', 2),
    (math_id, 'Coordinate Geometry', '坐标几何', 'coordinate-geometry', 3),
    (math_id, 'Geometry', '几何', 'geometry', 4),
    (math_id, 'Mensuration', '测量', 'mensuration', 5),
    (math_id, 'Trigonometry', '三角学', 'trigonometry', 6),
    (math_id, 'Vectors & Transformations', '向量与变换', 'vectors-and-transformations', 7),
    (math_id, 'Probability', '概率', 'probability', 8),
    (math_id, 'Statistics', '统计学', 'statistics', 9);
END $$;

-- CAIE Physics (0625) 主题
DO $$
DECLARE
  phys_id UUID;
BEGIN
  SELECT id INTO phys_id FROM subjects WHERE slug='caie-physics-0625';

  INSERT INTO topics (subject_id, name, display_name, slug, sort_order) VALUES
    (phys_id, 'General Physics', '普通物理', 'general-physics', 1),
    (phys_id, 'Thermal Physics', '热物理', 'thermal-physics', 2),
    (phys_id, 'Properties of Waves', '波的性质', 'properties-of-waves', 3),
    (phys_id, 'Electricity & Magnetism', '电磁学', 'electricity-and-magnetism', 4),
    (phys_id, 'Atomic Physics', '原子物理', 'atomic-physics', 5);
END $$;

-- CAIE Chemistry (0620) 主题
DO $$
DECLARE
  chem_id UUID;
BEGIN
  SELECT id INTO chem_id FROM subjects WHERE slug='caie-chemistry-0620';

  INSERT INTO topics (subject_id, name, display_name, slug, sort_order) VALUES
    (chem_id, 'States of Matter', '物质状态', 'states-of-matter', 1),
    (chem_id, 'Atoms, Elements & Compounds', '原子、元素和化合物', 'atoms-elements-compounds', 2),
    (chem_id, 'Stoichiometry', '化学计量', 'stoichiometry', 3),
    (chem_id, 'Electrochemistry', '电化学', 'electrochemistry', 4),
    (chem_id, 'Chemical Energetics', '化学能量学', 'chemical-energetics', 5),
    (chem_id, 'Chemical Reactions', '化学反应', 'chemical-reactions', 6),
    (chem_id, 'Acids, Bases & Salts', '酸碱盐', 'acids-bases-salts', 7),
    (chem_id, 'The Periodic Table', '元素周期表', 'the-periodic-table', 8),
    (chem_id, 'Metals', '金属', 'metals', 9),
    (chem_id, 'Organic Chemistry', '有机化学', 'organic-chemistry', 10);
END $$;
