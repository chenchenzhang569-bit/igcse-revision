svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280" width="500" height="280">
  <defs>
    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4da6ff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#0066cc" stop-opacity="0.75"/>
    </linearGradient>
  </defs>

  <!-- Cylinder X — water at 55ml → 200*0.55=110px from top, water height=90px -->
  <g transform="translate(60,20)">
    <rect x="0" y="0" width="80" height="200" rx="8" ry="8" fill="#f0f6ff" stroke="#999" stroke-width="1.8"/>
    <rect x="3" y="110" width="74" height="87" rx="6" ry="6" fill="url(#waterGrad)"/>
    <line x1="-6" y1="100" x2="86" y2="100" stroke="#aaa" stroke-width="1.2" stroke-dasharray="4,3"/>
    <text x="40" y="225" text-anchor="middle" font-size="20" font-weight="bold" fill="#333">X</text>
  </g>

  <!-- Cylinder Y — water at 70ml → 200*0.70=140px, water height=60px -->
  <g transform="translate(210,20)">
    <rect x="0" y="0" width="80" height="200" rx="8" ry="8" fill="#f0f6ff" stroke="#999" stroke-width="1.8"/>
    <rect x="3" y="60" width="74" height="137" rx="6" ry="6" fill="url(#waterGrad)"/>
    <line x1="-6" y1="100" x2="86" y2="100" stroke="#aaa" stroke-width="1.2" stroke-dasharray="4,3"/>
    <text x="40" y="225" text-anchor="middle" font-size="20" font-weight="bold" fill="#333">Y</text>
  </g>

  <!-- Cylinder Z — water at 53ml → 200*0.53=106px, water height=94px -->
  <g transform="translate(360,20)">
    <rect x="0" y="0" width="80" height="200" rx="8" ry="8" fill="#f0f6ff" stroke="#999" stroke-width="1.8"/>
    <rect x="3" y="106" width="74" height="91" rx="6" ry="6" fill="url(#waterGrad)"/>
    <line x1="-6" y1="100" x2="86" y2="100" stroke="#aaa" stroke-width="1.2" stroke-dasharray="4,3"/>
    <text x="40" y="225" text-anchor="middle" font-size="20" font-weight="bold" fill="#333">Z</text>
  </g>
</svg>'''

with open('/home/ubuntu/igcse-site/cylinder_fixed.svg', 'w') as f:
    f.write(svg)
print("Done:", len(svg), "chars")
