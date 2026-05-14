#!/usr/bin/env python3
"""Batch generate SVG diagrams for physics MCQ questions and embed as base64 data URIs in Supabase."""
import requests, base64, re, sys, os

SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
HEADERS = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}
PATCH_HEADERS = {**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"}

def generate_svg(question_text, subtopic_name):
    """Generate a simple SVG diagram based on question text description."""
    txt = question_text.lower()
    
    # Detect diagram type
    if 'force' in txt and ('arrow' in txt or 'newton' in txt or 'resultant' in txt or 'balanced' in txt or 'unbalanced' in txt):
        return forces_diagram(txt, question_text)
    elif 'spring' in txt or 'extension' in txt or 'load' in txt:
        return spring_graph(txt)
    elif 'graph' in txt or 'speed-time' in txt or 'velocity-time' in txt:
        return motion_graph(txt)
    elif 'circuit' in txt or 'resistor' in txt or 'battery' in txt or 'lamp' in txt or 'ammeter' in txt:
        return circuit_diagram(txt)
    elif 'magnet' in txt or 'solenoid' in txt or 'field line' in txt or 'magnetic field' in txt or 'coil' in txt:
        return magnet_diagram(txt)
    elif 'motor' in txt or 'generator' in txt:
        return motor_diagram(txt)
    elif 'block' in txt or 'cube' in txt or 'density' in txt or 'mass' in txt or 'weight' in txt:
        return block_diagram(txt)
    elif 'pressure' in txt or 'tank' in txt or 'dam' in txt:
        return pressure_diagram(txt)
    elif 'cylinder' in txt or 'measuring cylinder' in txt or 'liquid' in txt:
        return cylinder_diagram(txt)
    elif 'wave' in txt or 'ripple' in txt or 'reflection' in txt:
        return wave_diagram(txt)
    elif 'balance' in txt or 'beam' in txt:
        return balance_diagram(txt)
    elif 'transformer' in txt:
        return transformer_diagram(txt)
    elif 'particle' in txt or 'solid' in txt or 'liquid' in txt or 'gas' in txt:
        return particle_diagram(txt)
    elif 'parachute' in txt or 'skydiver' in txt:
        return skydiver_diagram(txt)
    elif 'car' in txt or 'vehicle' in txt or 'motorbike' in txt:
        return vehicle_forces_diagram(txt)
    elif 'plane' in txt or 'aeroplane' in txt or 'aircraft' in txt:
        return plane_forces_diagram(txt)
    else:
        return generic_diagram(txt, question_text)

def svg_wrap(body, title="Diagram"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" style="background:#fff;font-family:Arial,sans-serif"><text x="250" y="20" text-anchor="middle" font-size="11" fill="#888">{title}</text>{body}</svg>'

def forces_diagram(txt, full):
    # Object with force arrows
    svg = svg_wrap('''
  <rect x="180" y="130" width="140" height="80" rx="5" fill="#E3F2FD" stroke="#1565C0" stroke-width="2"/>
  <text x="250" y="175" text-anchor="middle" font-size="12" fill="#333">Object</text>
  <line x1="250" y1="80" x2="250" y2="125" stroke="#E53935" stroke-width="3" marker-end="url(#arrowR)"/>
  <text x="260" y="100" font-size="11" fill="#E53935">F1</text>
  <line x1="250" y1="215" x2="250" y2="260" stroke="#43A047" stroke-width="3" marker-end="url(#arrowG)"/>
  <text x="260" y="250" font-size="11" fill="#43A047">F2</text>
  <line x1="140" y1="170" x2="175" y2="170" stroke="#FB8C00" stroke-width="2" marker-end="url(#arrowO)"/>
  <text x="120" y="165" font-size="11" fill="#FB8C00">F3</text>
  <defs>
    <marker id="arrowR" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#E53935"/></marker>
    <marker id="arrowG" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#43A047"/></marker>
    <marker id="arrowO" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#FB8C00"/></marker>
  </defs>''', "Forces Diagram")
    return svg

def spring_graph(txt):
    return svg_wrap('''
  <line x1="60" y1="250" x2="460" y2="250" stroke="#333" stroke-width="1"/>
  <line x1="60" y1="250" x2="60" y2="40" stroke="#333" stroke-width="1"/>
  <text x="250" y="280" text-anchor="middle" font-size="11">Load / N</text>
  <text x="20" y="150" text-anchor="middle" font-size="11" transform="rotate(-90,20,150)">Extension / mm</text>
  <polyline points="60,250 160,200 260,240 360,180 440,140" fill="none" stroke="#E53935" stroke-width="2"/>
  <circle cx="260" cy="240" r="4" fill="#E53935"/>
  <text x="265" y="235" font-size="9" fill="#E53935">P</text>
  <line x1="60" y1="180" x2="440" y2="180" stroke="#999" stroke-width="1" stroke-dasharray="5,5"/>
  <text x="450" y="183" font-size="9" fill="#999">elastic limit</text>
''', "Spring Extension Graph")

def motion_graph(txt):
    return svg_wrap('''
  <line x1="60" y1="250" x2="460" y2="250" stroke="#333" stroke-width="1"/>
  <line x1="60" y1="250" x2="60" y2="40" stroke="#333" stroke-width="1"/>
  <text x="250" y="280" text-anchor="middle" font-size="11">Time / s</text>
  <text x="20" y="150" text-anchor="middle" font-size="11" transform="rotate(-90,20,150)">Velocity</text>
  <polyline points="60,250 160,230 260,180 360,100 440,60" fill="none" stroke="#1565C0" stroke-width="2"/>
'', "Velocity-Time Graph")

def circuit_diagram(txt):
    return svg_wrap('''
  <rect x="40" y="40" width="420" height="220" rx="5" fill="none" stroke="#ccc" stroke-width="1"/>
  <line x1="40" y1="100" x2="140" y2="100" stroke="#333" stroke-width="2"/>
  <line x1="140" y1="100" x2="170" y2="100" stroke="#333" stroke-width="2"/>
  <rect x="170" y="80" width="60" height="40" rx="3" fill="none" stroke="#333" stroke-width="2"/>
  <text x="200" y="105" text-anchor="middle" font-size="9" fill="#333">R1</text>
  <line x1="230" y1="100" x2="260" y2="100" stroke="#333" stroke-width="2"/>
  <rect x="170" y="160" width="60" height="40" rx="3" fill="none" stroke="#333" stroke-width="2"/>
  <text x="200" y="185" text-anchor="middle" font-size="9" fill="#333">R2</text>
  <line x1="230" y1="180" x2="300" y2="180" stroke="#333" stroke-width="2"/>
  <line x1="300" y1="100" x2="340" y2="100" stroke="#333" stroke-width="2"/>
  <line x1="300" y1="180" x2="340" y2="180" stroke="#333" stroke-width="2"/>
  <circle cx="340" cy="100" r="6" fill="none" stroke="#333" stroke-width="2"/>
  <text x="340" y="98" text-anchor="middle" font-size="7">A</text>
  <line x1="346" y1="100" x2="400" y2="100" stroke="#333" stroke-width="2"/>
  <line x1="340" y1="180" x2="400" y2="180" stroke="#333" stroke-width="2"/>
  <rect x="400" y="120" width="60" height="40" rx="2" fill="#E3F2FD" stroke="#1565C0" stroke-width="2"/>
  <text x="430" y="143" text-anchor="middle" font-size="9">Battery</text>
  <line x1="400" y1="100" x2="430" y2="100" stroke="#333" stroke-width="2"/>
''', "Circuit Diagram")

def magnet_diagram(txt):
    return svg_wrap('''
  <rect x="120" y="100" width="150" height="60" rx="3" fill="#E8EAF6" stroke="#3949AB" stroke-width="2"/>
  <text x="155" y="135" font-size="14" fill="#E53935" font-weight="bold">N</text>
  <text x="240" y="135" font-size="14" fill="#1565C0" font-weight="bold">S</text>
  <path d="M60,130 Q80,100 120,110 Q160,120 200,100 Q240,120 280,110 Q320,120 360,130" fill="none" stroke="#43A047" stroke-width="1.5"/>
  <path d="M60,150 Q80,170 120,160 Q160,150 200,170 Q240,150 280,160 Q320,150 360,150" fill="none" stroke="#43A047" stroke-width="1.5"/>
  <text x="350" y="80" font-size="9" fill="#43A047">field lines</text>
''', "Magnetic Field")

def motor_diagram(txt):
    return svg_wrap('''
  <rect x="150" y="80" width="100" height="50" rx="5" fill="#FFF3E0" stroke="#E65100" stroke-width="2"/>
  <text x="200" y="110" text-anchor="middle" font-size="10">Coil</text>
  <rect x="80" y="60" width="40" height="80" fill="#E8EAF6" stroke="#3949AB" stroke-width="1.5"/>
  <text x="100" y="100" text-anchor="middle" font-size="9" fill="#3949AB">N</text>
  <rect x="280" y="60" width="40" height="80" fill="#FFEBEE" stroke="#E53935" stroke-width="1.5"/>
  <text x="300" y="100" text-anchor="middle" font-size="9" fill="#E53935">S</text>
  <circle cx="200" cy="130" r="20" fill="none" stroke="#333" stroke-width="1"/>
  <text x="200" y="165" text-anchor="middle" font-size="9">split ring</text>
  <rect x="185" y="175" width="38" height="8" fill="#333"/>
  <text x="200" y="200" text-anchor="middle" font-size="9">brushes</text>
''', "DC Motor")

def block_diagram(txt):
    w, h = 100, 80
    return svg_wrap(f'''
  <rect x="200" y="110" width="{w}" height="{h}" rx="3" fill="#E3F2FD" stroke="#1565C0" stroke-width="2"/>
  <text x="250" y="155" text-anchor="middle" font-size="12">Block</text>
  <text x="250" y="175" text-anchor="middle" font-size="10" fill="#666">mass = m</text>
  <line x1="200" y1="190" x2="200" y2="270" stroke="#333" stroke-width="0.5"/>
  <line x1="300" y1="190" x2="300" y2="270" stroke="#333" stroke-width="0.5"/>
  <line x1="195" y1="270" x2="305" y2="270" stroke="#333" stroke-width="1"/>
  <text x="250" y="285" text-anchor="middle" font-size="10">d</text>
  <line x1="300" y1="270" x2="300" y2="275" stroke="#333" stroke-width="1"/>
''', "Block Diagram")

def pressure_diagram(txt):
    return svg_wrap('''
  <rect x="100" y="80" width="120" height="140" fill="#E3F2FD" stroke="#1565C0" stroke-width="2" rx="3"/>
  <text x="160" y="155" text-anchor="middle" font-size="10" fill="#1565C0">Fluid</text>
  <line x1="100" y1="220" x2="220" y2="220" stroke="#333" stroke-width="1.5"/>
  <circle cx="160" cy="170" r="3" fill="#E53935"/>
  <text x="170" y="165" font-size="9" fill="#E53935">X</text>
  <text x="160" y="240" text-anchor="middle" font-size="9">base area A</text>
  <line x1="60" y1="170" x2="100" y2="170" stroke="#999" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="50" y="165" font-size="9" fill="#999">h</text>
  <line x1="220" y1="170" x2="260" y2="170" stroke="#999" stroke-width="1" stroke-dasharray="3,3"/>
''', "Pressure Diagram")

def cylinder_diagram(txt):
    return svg_wrap('''
  <rect x="180" y="60" width="80" height="160" rx="3" fill="none" stroke="#1565C0" stroke-width="2"/>
  <rect x="180" y="120" width="80" height="100" fill="#E3F2FD" stroke="none"/>
  <text x="220" y="175" text-anchor="middle" font-size="10" fill="#1565C0">Liquid</text>
  <text x="220" y="235" text-anchor="middle" font-size="9">cm3</text>
  <line x1="175" y1="120" x2="265" y2="120" stroke="#E53935" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="270" y="123" font-size="9" fill="#E53935">meniscus</text>
''', "Measuring Cylinder")

def wave_diagram(txt):
    return svg_wrap('''
  <path d="M40,150 Q80,80 120,150 Q160,220 200,150 Q240,80 280,150 Q320,220 360,150 Q400,80 440,150" fill="none" stroke="#1565C0" stroke-width="2"/>
  <line x1="40" y1="150" x2="460" y2="150" stroke="#999" stroke-width="1" stroke-dasharray="5,5"/>
  <text x="100" y="75" font-size="9" fill="#E53935">crest</text>
  <text x="200" y="235" font-size="9" fill="#43A047">trough</text>
  <line x1="120" y1="70" x2="120" y2="150" stroke="#E53935" stroke-width="1" stroke-dasharray="2,2"/>
  <line x1="280" y1="70" x2="280" y2="150" stroke="#E53935" stroke-width="1" stroke-dasharray="2,2"/>
  <text x="195" y="65" font-size="9" fill="#E53935">- (wavelength)</text>
''', "Wave Diagram")

def balance_diagram(txt):
    return svg_wrap('''
  <polygon points="250,100 230,120 270,120" fill="#333"/>
  <line x1="250" y1="120" x2="250" y2="200" stroke="#333" stroke-width="1"/>
  <line x1="100" y1="200" x2="400" y2="200" stroke="#333" stroke-width="3"/>
  <rect x="70" y="180" width="60" height="40" rx="2" fill="#E3F2FD" stroke="#1565C0" stroke-width="1"/>
  <text x="100" y="205" text-anchor="middle" font-size="9">Object</text>
  <rect x="370" y="195" width="50" height="25" fill="#FFF3E0" stroke="#E65100" stroke-width="1"/>
  <text x="395" y="212" text-anchor="middle" font-size="9">Mass</text>
  <line x1="250" y1="200" x2="250" y2="210" stroke="#333" stroke-width="1"/>
  <polygon points="245,210 255,210 250,218" fill="#333"/>
''', "Balance")

def transformer_diagram(txt):
    return svg_wrap('''
  <rect x="80" y="100" width="60" height="120" rx="5" fill="#E8EAF6" stroke="#3949AB" stroke-width="2"/>
  <rect x="260" y="100" width="60" height="120" rx="5" fill="#FFEBEE" stroke="#E53935" stroke-width="2"/>
  <rect x="140" y="80" width="120" height="160" rx="3" fill="none" stroke="#333" stroke-width="2"/>
  <text x="90" y="165" text-anchor="middle" font-size="9">Primary</text>
  <text x="270" y="165" text-anchor="middle" font-size="9">Secondary</text>
  <text x="180" y="95" text-anchor="middle" font-size="9">Iron Core</text>
  <text x="90" y="85" font-size="9">Vp</text>
  <text x="285" y="85" font-size="9">Vs</text>
''', "Transformer")

def particle_diagram(txt):
    return svg_wrap('''
  <rect x="30" y="30" width="200" height="240" rx="5" fill="#f8f8f8" stroke="#ccc"/>
  <text x="130" y="50" text-anchor="middle" font-size="10" fill="#333">Solid</text>
  <circle cx="80" cy="90" r="8" fill="#E53935" opacity="0.8"/>
  <circle cx="130" cy="85" r="8" fill="#43A047" opacity="0.8"/>
  <circle cx="110" cy="110" r="8" fill="#1565C0" opacity="0.8"/>
  <circle cx="140" cy="105" r="8" fill="#FB8C00" opacity="0.8"/>
  <circle cx="85" cy="115" r="8" fill="#8E24AA" opacity="0.8"/>
  
  <rect x="270" y="30" width="200" height="240" rx="5" fill="#f8f8f8" stroke="#ccc"/>
  <text x="370" y="50" text-anchor="middle" font-size="10" fill="#333">Liquid</text>
  <circle cx="310" cy="90" r="8" fill="#E53935" opacity="0.8"/>
  <circle cx="350" cy="100" r="8" fill="#43A047" opacity="0.8"/>
  <circle cx="330" cy="130" r="8" fill="#1565C0" opacity="0.8"/>
  <circle cx="380" cy="120" r="8" fill="#FB8C00" opacity="0.8"/>
  <circle cx="300" cy="140" r="8" fill="#8E24AA" opacity="0.8"/>
  <circle cx="370" cy="150" r="8" fill="#E53935" opacity="0.8"/>
''', "Particle Model")

def skydiver_diagram(txt):
    return svg_wrap('''
  <text x="250" y="40" text-anchor="middle" font-size="11">Skydiver - Terminal Velocity</text>
  <circle cx="250" cy="130" r="15" fill="#E3F2FD" stroke="#1565C0" stroke-width="1.5"/>
  <text x="250" y="134" text-anchor="middle" font-size="8">m</text>
  <line x1="250" y1="65" x2="250" y2="110" stroke="#E53935" stroke-width="3" marker-end="url(#arrowR)"/>
  <text x="260" y="85" font-size="10" fill="#E53935">weight</text>
  <line x1="250" y1="150" x2="250" y2="195" stroke="#43A047" stroke-width="3" marker-end="url(#arrowG)"/>
  <text x="260" y="185" font-size="10" fill="#43A047">air resistance</text>
  <defs>
    <marker id="arrowR" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#E53935"/></marker>
    <marker id="arrowG" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#43A047"/></marker>
  </defs>
''', "Skydiver Forces")

def vehicle_forces_diagram(txt):
    return svg_wrap('''
  <rect x="120" y="120" width="200" height="60" rx="10" fill="#E3F2FD" stroke="#1565C0" stroke-width="2"/>
  <text x="220" y="155" text-anchor="middle" font-size="11">Vehicle</text>
  <circle cx="160" cy="190" r="15" fill="none" stroke="#333" stroke-width="1.5"/>
  <circle cx="280" cy="190" r="15" fill="none" stroke="#333" stroke-width="1.5"/>
  <line x1="320" y1="150" x2="380" y2="150" stroke="#43A047" stroke-width="3" marker-end="url(#arrowG)"/>
  <text x="360" y="140" font-size="10" fill="#43A047">driving force</text>
  <line x1="120" y1="135" x2="60" y2="135" stroke="#E53935" stroke-width="2" marker-end="url(#arrowR2)"/>
  <text x="50" y="125" font-size="10" fill="#E53935">friction</text>
  <defs>
    <marker id="arrowR2" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto"><path d="M8,0 L0,3 L8,6 Z" fill="#E53935"/></marker>
    <marker id="arrowG" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#43A047"/></marker>
  </defs>
''', "Vehicle Forces")

def plane_forces_diagram(txt):
    return svg_wrap('''
  <ellipse cx="250" cy="150" rx="120" ry="25" fill="#E3F2FD" stroke="#1565C0" stroke-width="1.5"/>
  <polygon points="370,150 400,160 370,175" fill="#E3F2FD" stroke="#1565C0" stroke-width="1"/>
  <text x="250" y="153" text-anchor="middle" font-size="10">Aeroplane</text>
  <line x1="250" y1="120" x2="250" y2="60" stroke="#43A047" stroke-width="2"/>
  <text x="260" y="85" font-size="9" fill="#43A047">lift</text>
  <line x1="250" y1="180" x2="250" y2="230" stroke="#E53935" stroke-width="2"/>
  <text x="260" y="215" font-size="9" fill="#E53935">weight</text>
  <line x1="370" y1="150" x2="430" y2="150" stroke="#43A047" stroke-width="2"/>
  <text x="390" y="140" font-size="9" fill="#43A047">thrust</text>
  <line x1="130" y1="150" x2="70" y2="150" stroke="#E53935" stroke-width="2"/>
  <text x="55" y="140" font-size="9" fill="#E53935">drag</text>
''', "Aeroplane Forces")

def generic_diagram(txt, full):
    return svg_wrap('''
  <rect x="150" y="100" width="200" height="100" rx="8" fill="#f0f4ff" stroke="#8899cc" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="250" y="140" text-anchor="middle" font-size="11" fill="#667">Refer to question</text>
  <text x="250" y="160" text-anchor="middle" font-size="11" fill="#667">text for diagram</text>
  <text x="250" y="185" text-anchor="middle" font-size="9" fill="#aab">(illustrative placeholder)</text>
''', "Diagram")

def main():
    # Get subtopic names
    r = requests.get(f"{SUPABASE_URL}/rest/v1/subtopics", headers=HEADERS, params={"select":"id,name","limit":"50"}, timeout=10)
    sub_names = {s['id']: s['name'] for s in r.json()}
    
    # Get questions needing diagrams
    r2 = requests.get(f"{SUPABASE_URL}/rest/v1/questions", headers=HEADERS,
        params={
            "select": "id,subtopic_id,question_text,answer_text",
            "subject_id": "eq.ebff2ce1-76b1-44d7-b333-e42f69860a5c",
            "or": "(question_text.ilike.*diagram*,question_text.ilike.*shown*,question_text.ilike.*figure*,question_text.ilike.*graph*)",
            "question_text": "not.ilike.*data:image*",
            "limit": "100"
        }, timeout=10)
    
    questions = [q for q in r2.json() if q.get('subtopic_id') and 'raw.githubusercontent' not in q.get('question_text','')]
    
    count = 0
    for q in questions:
        qid = q['id']
        txt = q['question_text']
        sub_name = sub_names.get(q['subtopic_id'], q['subtopic_id'][:8])
        
        # Generate SVG
        svg = generate_svg(txt, sub_name)
        b64 = base64.b64encode(svg.encode()).decode()
        data_uri = f"data:image/svg+xml;base64,{b64}"
        
        # Find first option line to insert image before it
        lines = txt.split('\n')
        insert_pos = len(txt)
        for i, line in enumerate(lines):
            if re.match(r'^[A-D][.)]', line.strip()):
                # Find position of this line in original text
                insert_pos = txt.index(line.strip())
                break
        
        # Build new text: before options + image + options
        if insert_pos < len(txt):
            new_txt = txt[:insert_pos].rstrip() + f'\n\n![diagram]({data_uri})\n\n' + txt[insert_pos:].lstrip()
        else:
            new_txt = txt + f'\n\n![diagram]({data_uri})'
        
        # PATCH Supabase
        r3 = requests.patch(f"{SUPABASE_URL}/rest/v1/questions", headers=PATCH_HEADERS,
            params={"id": f"eq.{qid}"},
            json={"question_text": new_txt},
            timeout=10)
        
        status = "-" if r3.status_code == 204 else f"-{r3.status_code}"
        count += 1
        print(f"[{count}/{len(questions)}] {status} {qid[:20]}... ({sub_name}, {len(new_txt)}b)")
        
        if count >= 85:
            break
    
    print(f"\nDone! Updated {count} questions.")

if __name__ == "__main__":
    main()