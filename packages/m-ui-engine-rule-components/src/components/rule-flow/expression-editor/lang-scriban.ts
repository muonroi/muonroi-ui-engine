/**
 * Scriban template language syntax highlighting for CodeMirror 6.
 * Uses StreamLanguage for tokenization of {{ expression }} blocks.
 *
 * Covers: expression delimiters, keywords, pipes (function calls),
 * strings, numbers, identifiers, member access, and plain text passthrough.
 */
import { StreamLanguage, type StringStream } from "@codemirror/language";

const SCRIBAN_KEYWORDS = new Set([
  "if", "else", "elseif", "end",
  "for", "in", "while",
  "break", "continue",
  "func", "ret",
  "wrap", "import", "readonly", "with",
  "capture", "tablerow",
  "include", "case", "when",
  "true", "false", "null",
  "and", "or", "not",
  "empty"
]);

interface ScribanState {
  inExpression: boolean;
  inString: boolean;
  stringChar: string;
}

function mScribanToken(stream: StringStream, state: ScribanState): string | null {
  // Inside expression block
  if (state.inExpression) {
    return mScribanExprContent(stream, state);
  }

  // Outside — look for {{ or {%
  if (stream.match("{{")) {
    state.inExpression = true;
    return "bracket";
  }

  // Plain text — skip to next potential expression or end of line
  while (!stream.eol()) {
    if (stream.match("{{", false)) {
      break;
    }
    stream.next();
  }
  return null;
}

function mScribanExprContent(stream: StringStream, state: ScribanState): string | null {
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

  // Closing delimiter
  if (stream.match("}}")) {
    state.inExpression = false;
    return "bracket";
  }

  // Skip whitespace
  if (stream.eatSpace()) return null;

  const ch = stream.peek();

  // Strings
  if (ch === '"' || ch === "'") {
    state.inString = true;
    state.stringChar = ch!;
    stream.next();
    return mScribanExprContent(stream, state);
  }

  // Line comment inside expression
  if (stream.match("##")) {
    stream.skipToEnd();
    return "comment";
  }

  // Numbers
  if (stream.match(/^-?\d+(\.\d+)?/)) {
    return "number";
  }

  // Pipe — function application
  if (ch === "|") {
    stream.next();
    return "operator";
  }

  // Multi-character operators
  if (stream.match("==") || stream.match("!=") || stream.match("<=") || stream.match(">=") || stream.match("..")) {
    return "operator";
  }

  // Single-character operators
  if (ch && "=<>+-*/%!".includes(ch)) {
    stream.next();
    return "operator";
  }

  // Member access
  if (ch === ".") {
    stream.next();
    return "operator";
  }

  // Brackets
  if (ch && "()[]".includes(ch)) {
    stream.next();
    return "bracket";
  }

  // Comma, colon, semicolon
  if (ch && ",;:".includes(ch)) {
    stream.next();
    return "punctuation";
  }

  // Words: keywords, identifiers
  if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
    const word = stream.current();
    if (SCRIBAN_KEYWORDS.has(word)) return "keyword";
    // After pipe, treat as function
    if (stream.peek() === "(") return "variableName.function";
    return "variableName";
  }

  // Skip unknown
  stream.next();
  return null;
}

export const scribanLanguage = StreamLanguage.define<ScribanState>({
  startState(): ScribanState {
    return { inExpression: false, inString: false, stringChar: "" };
  },
  token: mScribanToken,
  languageData: {
    commentTokens: { line: "##" }
  }
});
