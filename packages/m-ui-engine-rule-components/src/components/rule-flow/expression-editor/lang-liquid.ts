/**
 * Liquid template language syntax highlighting for CodeMirror 6.
 * Uses StreamLanguage for tokenization of {{ output }} and {% logic %} tags.
 *
 * Covers: output delimiters, logic tag delimiters, keywords, filters (pipe),
 * strings, numbers, identifiers, and plain text passthrough.
 */
import { StreamLanguage, type StringStream } from "@codemirror/language";

const LIQUID_KEYWORDS = new Set([
  "if", "else", "elsif", "endif",
  "for", "endfor", "in",
  "unless", "endunless",
  "case", "when", "endcase",
  "assign", "capture", "endcapture",
  "include", "render",
  "comment", "endcomment",
  "raw", "endraw",
  "tablerow", "endtablerow",
  "cycle", "increment", "decrement",
  "break", "continue",
  "paginate", "endpaginate",
  "true", "false", "nil", "null",
  "and", "or", "not",
  "contains", "blank", "empty"
]);

type LiquidTagMode = "output" | "logic" | null;

interface LiquidState {
  inTag: LiquidTagMode;
  inString: boolean;
  stringChar: string;
}

function mLiquidToken(stream: StringStream, state: LiquidState): string | null {
  // Inside a tag — tokenize inner content
  if (state.inTag) {
    return mLiquidTagContent(stream, state);
  }

  // Outside tags — look for {{ or {%
  if (stream.match("{{")) {
    state.inTag = "output";
    return "bracket";
  }
  if (stream.match("{%")) {
    state.inTag = "logic";
    return "bracket";
  }

  // Plain text — skip to next potential tag or end of line
  while (!stream.eol()) {
    if (stream.match("{{", false) || stream.match("{%", false)) {
      break;
    }
    stream.next();
  }
  return null;
}

function mLiquidTagContent(stream: StringStream, state: LiquidState): string | null {
  // Handle string continuation
  if (state.inString) {
    while (!stream.eol()) {
      const ch = stream.next();
      if (ch === "\\") {
        stream.next();
      } else if (ch === state.stringChar) {
        state.inString = false;
        return "string";
      }
    }
    return "string";
  }

  // Check closing delimiters
  if (state.inTag === "output" && stream.match("}}")) {
    state.inTag = null;
    return "bracket";
  }
  if (state.inTag === "logic" && stream.match("%}")) {
    state.inTag = null;
    return "bracket";
  }

  // Skip whitespace inside tags
  if (stream.eatSpace()) return null;

  const ch = stream.peek();

  // Strings
  if (ch === '"' || ch === "'") {
    state.inString = true;
    state.stringChar = ch!;
    stream.next();
    return mLiquidTagContent(stream, state);
  }

  // Numbers
  if (stream.match(/^-?\d+(\.\d+)?/)) {
    return "number";
  }

  // Pipe — filter separator
  if (ch === "|") {
    stream.next();
    return "operator";
  }

  // Comparison operators
  if (stream.match("==") || stream.match("!=") || stream.match("<=") || stream.match(">=")) {
    return "operator";
  }
  if (ch === "<" || ch === ">") {
    stream.next();
    return "operator";
  }

  // Assignment
  if (ch === "=") {
    stream.next();
    return "operator";
  }

  // Dot accessor
  if (ch === ".") {
    stream.next();
    return "operator";
  }

  // Brackets
  if (ch && "()[]".includes(ch)) {
    stream.next();
    return "bracket";
  }

  // Comma, colon
  if (ch === "," || ch === ":") {
    stream.next();
    return "punctuation";
  }

  // Range operator ..
  if (stream.match("..")) {
    return "operator";
  }

  // Words: keywords, filter names, identifiers
  if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_?]*/)) {
    const word = stream.current();
    if (LIQUID_KEYWORDS.has(word)) return "keyword";
    // After pipe, treat as filter function name
    return "variableName";
  }

  // Skip unknown
  stream.next();
  return null;
}

export const liquidLanguage = StreamLanguage.define<LiquidState>({
  startState(): LiquidState {
    return { inTag: null, inString: false, stringChar: "" };
  },
  token: mLiquidToken,
  languageData: {
    commentTokens: { block: { open: "{%- comment -%}", close: "{%- endcomment -%}" } }
  }
});
