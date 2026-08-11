import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Checks if a $...$ capture is likely math (not currency).
 * Since we now aggressively pre-mask currency like "$92" to "CURR92",
 * most false positives are already eliminated. We just need to catch
 * stray edge cases where a $ isn't followed by a number but pairs with another $.
 */
function isMathContent(content) {
  const trimmed = content.trim();
  if (!trimmed) return false;

  // If it has LaTeX commands, it's definitely math
  if (/\\[a-zA-Z]/.test(content)) return true;
  // If it has braces/subscript/superscript, it's math
  if (/[{}_^]/.test(content)) return true;
  // Math operators
  if (/[=<>≤≥≠±×÷∞∑∏∫+\-*/]/.test(content)) return true;

  // Pure numbers inside $...$ (like $12.45$) should be rendered as math
  // Unless it ends with a trailing comma/period from prose
  if (/^[\d,.\s]+$/.test(trimmed)) {
    if (/[.,]\s*$/.test(content)) return false;
    return true;
  }

  // Very common prose words that might accidentally appear between stray $ signs
  const proseWords = new Set([
    "and", "or", "if", "the", "an", "is", "are", "was", "were", 
    "of", "to", "in", "on", "for", "with", "as", "by", "at", "from", 
    "this", "that", "it", "be", "not", "but", "which", "where", "when",
    "who", "why", "how", "what", "then", "than", "so", "do", "does", "did",
    "has", "have", "had", "my", "your", "his", "her", "our", "their",
    "we", "he", "she", "they", "me", "him", "us", "them", "am", "go", "no"
  ]);

  const words = trimmed.split(/[\s,.'()]+/);
  const validWords = words.filter(w => w.length > 0);

  // If any word is a common prose word, it's likely not math
  if (validWords.some(w => proseWords.has(w.toLowerCase()))) {
    return false;
  }

  // If there's any 3+ letter word that isn't ALL CAPS (like ABC for a triangle),
  // it's almost certainly prose (e.g. "brother", "cost", "ticket")
  const hasLongEnglishWord = validWords.some(w => {
    if (w.length >= 3 && /^[a-zA-Z]+$/.test(w) && w.toUpperCase() !== w) {
      return true;
    }
    return false;
  });

  if (hasLongEnglishWord) {
    return false;
  }

  // Lists of variables like $x, y, z$ or $A, B, C$
  if (/^[a-zA-Z0-9\s()',.]+$/.test(trimmed) && trimmed.length <= 40) {
    // If it has a trailing comma/period from the end of a sentence, reject
    if (/[.,]\s*$/.test(content)) return false;
    return true; 
  }

  // If it has 3 or more words and didn't match the above, probably prose
  if (validWords.length >= 3) return false;
  
  if (/[.,]\s*$/.test(content)) return false;
  
  return true;
}

/**
 * Detects whether a plain text segment contains LaTeX commands or math
 * structures (^{}, _{}, \frac, \left, etc.) that should be rendered as math.
 */
const LATEX_CMD = /\\(?:frac|tfrac|dfrac|sqrt|left|right|quad|qquad|cdot|cdots|ldots|times|div|pm|mp|leq|geq|neq|approx|infty|sum|prod|int|lim|log|ln|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|theta|alpha|beta|gamma|delta|pi|sigma|mu|lambda|epsilon|phi|psi|omega|text|mathrm|mathbf|mathit|overline|underline|hat|bar|vec|dot|ddot|binom|dbinom|tbinom|begin|end|hline|to|rightarrow|leftarrow|Rightarrow|Leftarrow|le|ge|ne|not)/;

/**
 * Process a plain text segment that may contain undelimited LaTeX.
 * Splits into lines, and for each line decides if it should be rendered as math.
 */
function processPlainSegment(text) {
  if (!text) return [];
  
  // Quick check — if no LaTeX indicators at all, return as-is
  if (!LATEX_CMD.test(text) && !/[_^]\{/.test(text) && !/\{[^}]+\}/.test(text)) {
    return [{ type: 'text', content: text }];
  }

  const results = [];
  // Process line by line to preserve structure
  const lines = text.split('\n');
  
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (li > 0) results.push({ type: 'text', content: '\n' });
    
    if (!line.trim()) {
      results.push({ type: 'text', content: line });
      continue;
    }

    // If the line doesn't contain any LaTeX, keep as text
    if (!LATEX_CMD.test(line) && !/[_^]\{/.test(line)) {
      results.push({ type: 'text', content: line });
      continue;
    }

    // The line has LaTeX. We need to find and wrap the math segments.
    // Strategy: scan left-to-right, identify math regions by finding LaTeX
    // commands or ^{}/_{} and expanding to find their boundaries.
    const parts = splitLineMath(line);
    results.push(...parts);
  }

  return results;
}

/**
 * Check if a word token is an English word (not a math variable).
 * Single letters like x, y, d, n ARE math variables.
 * Multi-letter words that are English should not be in math mode.
 */
function isEnglishWord(token) {
  if (!token || token.length === 0) return false;
  // Treat any 2+ letter all-alpha token as an English word for the sake of boundary stopping
  if (/^[a-zA-Z]{2,}$/.test(token)) return true;
  return false;
}

/**
 * Split a single line into alternating text and math segments.
 * Only wraps segments that contain actual LaTeX commands or ^{}/_{}.
 * Stops expanding at English word boundaries to prevent prose from
 * being rendered as math.
 */
function splitLineMath(line) {
  const markers = [];
  
  const cmdRe = /\\[a-zA-Z]+/g;
  let m;
  while ((m = cmdRe.exec(line)) !== null) {
    markers.push({ index: m.index, len: m[0].length });
  }
  
  const expRe = /[_^]\{/g;
  while ((m = expRe.exec(line)) !== null) {
    markers.push({ index: m.index, len: m[0].length });
  }

  if (markers.length === 0) {
    return [{ type: 'text', content: line }];
  }

  markers.sort((a, b) => a.index - b.index);

  const mathRanges = [];
  
  for (const marker of markers) {
    let start = marker.index;
    let end = marker.index + marker.len;

    // Expand backwards — but stop at English words
    let s = start;
    while (s > 0) {
      const ch = line[s - 1];
      if (ch === ' ' || ch === '\t') {
        // Look back past spaces for the previous token
        let probe = s - 1;
        while (probe > 0 && line[probe - 1] === ' ') probe--;
        // Find the start of the previous token
        let tokenEnd = probe;
        let tokenStart = probe;
        while (tokenStart > 0 && /[a-zA-Z0-9()=+\-*/.,^_{}[\]<>≤≥≠±]/.test(line[tokenStart - 1])) tokenStart--;
        const prevToken = line.slice(tokenStart, tokenEnd);
        if (isEnglishWord(prevToken)) break;
        s--;
      } else if (/[a-zA-Z]/.test(ch)) {
        // Check if we're about to absorb an English word
        let wordStart = s - 1;
        while (wordStart > 0 && /[a-zA-Z]/.test(line[wordStart - 1])) wordStart--;
        const word = line.slice(wordStart, s);
        if (isEnglishWord(word)) break;
        s = wordStart;
      } else if (/[0-9(){}[\]^_=+\-*/.,<>≤≥≠±]/.test(ch)) {
        s--;
      } else {
        break;
      }
    }
    start = s;

    // Expand forwards — but stop at English words
    let braceDepth = 0;
    // Start `e` from `start` instead of `end` to correctly track brace depths from the beginning of the marker
    let e = start;
    while (e < line.length) {
      const ch = line[e];
      if (ch === '{') { braceDepth++; e++; continue; }
      if (ch === '}') { braceDepth--; if (braceDepth < 0) break; e++; continue; }
      if (braceDepth > 0) { e++; continue; }

      if (ch === '\\') {
        // LaTeX command — always include
        e++;
        while (e < line.length && /[a-zA-Z]/.test(line[e])) e++;
        continue;
      }

      if (ch === ' ' || ch === '\t') {
        // Look ahead past spaces for the next token
        let probe = e + 1;
        while (probe < line.length && line[probe] === ' ') probe++;
        if (probe >= line.length) break;
        // Find the next token
        let tokenStart = probe;
        let tokenEnd = probe;
        while (tokenEnd < line.length && /[a-zA-Z]/.test(line[tokenEnd])) tokenEnd++;
        const nextToken = line.slice(tokenStart, tokenEnd);
        if (isEnglishWord(nextToken)) break;
        // Next token is math-like, continue through the space
        e = probe;
        continue;
      }

      if (/[a-zA-Z]/.test(ch)) {
        // Check if this starts an English word
        let wordEnd = e;
        while (wordEnd < line.length && /[a-zA-Z]/.test(line[wordEnd])) wordEnd++;
        const word = line.slice(e, wordEnd);
        if (isEnglishWord(word)) break;
        e = wordEnd;
        continue;
      }

      if (/[0-9()[\]^_=+\-*/.,<>≤≥≠±]/.test(ch)) {
        e++;
        continue;
      }

      break;
    }
    end = Math.max(e, marker.index + marker.len);

    // Trim spaces
    while (start < end && line[start] === ' ') start++;
    while (end > start && line[end - 1] === ' ') end--;

    if (end > start) {
      mathRanges.push({ start, end });
    }
  }

  if (mathRanges.length === 0) {
    return [{ type: 'text', content: line }];
  }

  // Merge overlapping/adjacent ranges
  mathRanges.sort((a, b) => a.start - b.start);
  const merged = [{ ...mathRanges[0] }];
  for (let i = 1; i < mathRanges.length; i++) {
    const last = merged[merged.length - 1];
    if (mathRanges[i].start <= last.end + 2) {
      last.end = Math.max(last.end, mathRanges[i].end);
    } else {
      merged.push({ ...mathRanges[i] });
    }
  }

  const parts = [];
  let lastIdx = 0;
  for (const range of merged) {
    if (range.start > lastIdx) {
      parts.push({ type: 'text', content: line.slice(lastIdx, range.start) });
    }
    const mathContent = line.slice(range.start, range.end);
    if (LATEX_CMD.test(mathContent) || /[_^]\{/.test(mathContent)) {
      parts.push({ type: 'inline', content: mathContent });
    } else {
      parts.push({ type: 'text', content: mathContent });
    }
    lastIdx = range.end;
  }
  if (lastIdx < line.length) {
    parts.push({ type: 'text', content: line.slice(lastIdx) });
  }

  return parts;
}

/**
 * MathText: renders strings containing LaTeX math with proper KaTeX rendering.
 * Handles:
 *   - Block math:  $$ ... $$  or  \[ ... \]
 *   - Inline math: $ ... $  or  \( ... \)
 *   - Undelimited LaTeX commands (auto-detected and wrapped)
 *   - Currency $ signs (not treated as math delimiters)
 */
class MathErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <span>{this.props.fallback}</span>;
    }
    return this.props.children;
  }
}

function SafeInlineMath({ math }) {
  return (
    <MathErrorBoundary fallback={math}>
      <span className="px-1 text-[1.15em] tracking-normal text-slate-800 dark:text-slate-200">
        <InlineMath math={math} renderError={() => <span className="text-slate-800 dark:text-slate-200">{math}</span>} />
      </span>
    </MathErrorBoundary>
  );
}

function SafeBlockMath({ math }) {
  return (
    <MathErrorBoundary fallback={math}>
      <span className="block my-6 overflow-x-auto overflow-y-hidden py-4 text-center text-[1.2em] tracking-normal scrollbar-thin text-slate-800 dark:text-slate-200">
        <BlockMath math={math} renderError={() => <span className="text-slate-800 dark:text-slate-200">{math}</span>} />
      </span>
    </MathErrorBoundary>
  );
}

export default function MathText({ children, className = '' }) {
  if (!children) return null;
  const text = String(children);

  const parts = [];

  const ESCAPED_DOLLAR = '\x00ESCDOL';

  // Replace literal \n with actual newlines to fix table formatting and Katex parsing errors
  let processedText = text.replace(/\\n/g, '\n');

  // Pass 0: Mask escaped dollar signs (\$ -> ESCAPED_DOLLAR)
  // This prevents them from acting as math delimiters and allows us to strip the backslash in plain text.
  processedText = processedText.replace(/\\\$/g, ESCAPED_DOLLAR);

  // Now parse math delimiters on the sanitized string
  const combined = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
  let match;
  let lastIndex = 0;

  while ((match = combined.exec(processedText)) !== null) {
    const isBlock = match[1] !== undefined || match[2] !== undefined;
    const isParenInline = match[3] !== undefined;
    const dollarContent = match[4];

    // For $...$ matches, verify it's actually math
    if (dollarContent !== undefined && !isMathContent(dollarContent)) {
      // If it's not math (e.g. "$12..."), we don't want to consume the entire matched string
      // because the closing '$' might actually be the opening '$' of a real math block!
      // So we reset the regex index to just after the opening '$' and continue.
      combined.lastIndex = match.index + 1;
      continue;
    }

    if (match.index > lastIndex) {
      parts.push(...processPlainSegment(processedText.slice(lastIndex, match.index)));
    }

    const rawContent = isBlock ? (match[1] ?? match[2]) : (isParenInline ? match[3] : dollarContent);
    if (isBlock) {
      parts.push({ type: 'block', content: rawContent });
    } else {
      parts.push({ type: 'inline', content: rawContent });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < processedText.length) {
    parts.push(...processPlainSegment(processedText.slice(lastIndex)));
  }

  // Restore placeholders based on context
  function restoreForMath(s) {
    if (!s) return s;
    return s.split(ESCAPED_DOLLAR).join('\\$');
  }

  function restoreForText(s) {
    if (!s) return s;
    return s.split(ESCAPED_DOLLAR).join('$');
  }

  if (parts.length === 0) {
    return <span className={`text-slate-800 dark:text-slate-200 text-[1.05em] leading-relaxed font-medium ${className}`}>{restoreForText(processedText)}</span>;
  }

  return (
    <span className={`text-slate-800 dark:text-slate-200 text-[1.05em] leading-relaxed tracking-wide font-medium ${className}`} style={{ overflowWrap: 'break-word' }}>
      {parts.map((part, i) => {
        if (part.type === 'block') {
          return <SafeBlockMath key={i} math={restoreForMath(part.content)} />;
        }
        if (part.type === 'inline') {
          return <SafeInlineMath key={i} math={restoreForMath(part.content)} />;
        }
        return (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
            {restoreForText(part.content)}
          </span>
        );
      })}
    </span>
  );
}
