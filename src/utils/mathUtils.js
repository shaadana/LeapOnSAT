export const sanitizeMathInput = (str) => {
  if (!str) return '';
  // Allow digits, decimal, slash, minus, plus, and specific math symbols
  // π, √, ^, ±, °, θ, ≤, ≥, =, x, y, space
  return str.replace(/[^0-9./\-+π√^±°θ≤≥=xy\s]/gi, '');
};

export const cleanLatexString = (str) => {
  if (str == null) return '';
  let s = String(str).trim();
  s = s.replace(/\$/g, '');
  s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2');
  s = s.replace(/\\%/g, '');
  s = s.replace(/%/g, '');
  s = s.replace(/\^\\circ/g, '');
  return s;
};

export const toNumeric = (a) => {
  if (a == null) return null;
  
  let s = cleanLatexString(a);
  
  // Extract the first valid number or fraction from the string (ignoring surrounding words/units)
  const match = s.match(/[+-]?\s*(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?\s*(?:\d+(?:\.\d*)?|\.\d+))?/);
  if (!match) return null;
  
  const cleaned = match[0].replace(/[\s,]+/g, '');
  
  const fracParts = cleaned.split('/');
  if (fracParts.length === 2) {
    const num = Number(fracParts[0]);
    const den = Number(fracParts[1]);
    if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
  }
  
  const num = Number(cleaned);
  if (!isNaN(num)) return num;
  
  return null;
};

// Normalize LaTeX symbol commands to their Unicode equivalents so that a
// correct answer stored as LaTeX (e.g. "3362\pi", "\sqrt{2}") matches a
// student's math-keyboard input (e.g. "3362π", "√2").
export const normalizeMathSymbols = (str) => {
  if (str == null) return '';
  let s = String(str);
  s = s.replace(/\\pi\b/g, 'π');
  s = s.replace(/\\sqrt\s*\{?/g, '√');
  s = s.replace(/\\theta\b/g, 'θ');
  s = s.replace(/\\pm\b/g, '±');
  s = s.replace(/\\circ\b/g, '°');
  s = s.replace(/\\leq\b/g, '≤');
  s = s.replace(/\\geq\b/g, '≥');
  s = s.replace(/\\neq\b/g, '≠');
  s = s.replace(/\\cdot\b/g, '·');
  s = s.replace(/\\times\b/g, '×');
  s = s.replace(/\\div\b/g, '÷');
  // Strip any remaining LaTeX commands, backslashes, and grouping braces
  s = s.replace(/\\[a-zA-Z]+/g, '').replace(/[\\{}]/g, '');
  return s;
};

export const answersEquivalent = (user, correct) => {
  if (!user || !correct) return false;
  const nu = toNumeric(user), nc = toNumeric(correct);
  if (nu !== null && nc !== null) return Math.abs(nu - nc) < 0.002;
  
  const cleanUser = normalizeMathSymbols(cleanLatexString(user)).replace(/[\s,]/g, '').toLowerCase();
  const cleanCorrect = normalizeMathSymbols(cleanLatexString(correct)).replace(/[\s,]/g, '').toLowerCase();
  return cleanUser === cleanCorrect;
};
