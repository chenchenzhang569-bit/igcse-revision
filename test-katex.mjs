import katex from "katex";

function renderMath(text) {
  let result = text;
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  
  result = result.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch { return `$$${math}$$`; }
  });

  result = result.replace(/\$(?=[a-zA-Z0-9\\\{\-])(.+?)(?<!\\)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch { return `$${math}$`; }
  });
  return result;
}

// Test basic KaTeX
console.log("=== Test 1: $x^2$ ===");
console.log(renderMath("Solve $x^2 + 3x - 4 = 0$"));
console.log("");

console.log("=== Test 2: $\\sqrt{x}$ ===");
console.log(renderMath("Find $\\sqrt{x}$"));
console.log("");

// Test with DB-like content
console.log("=== Test 3: Real-world ===");
console.log(renderMath("Calculate $\\frac{1}{2} \\times \\frac{3}{4}$"));
console.log("");

// Test: what if data has no $ signs?
console.log("=== Test 4: No dollars ===");
console.log(renderMath("Calculate x^2 + 3x - 4 = 0"));
