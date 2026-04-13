/**
 * FEEL (Friendly Enough Expression Language) syntax highlighting for CodeMirror 6.
 * Uses StreamLanguage for simple tokenization of expression-level editing.
 *
 * Covers: keywords, booleans, null, numbers, strings, operators, brackets,
 * field references (dot paths), identifiers, and line comments.
 */
import { StreamLanguage, type StringStream } from "@codemirror/language";

const FEEL_KEYWORDS = new Set([
  "if", "then", "else", "for", "in", "return",
  "some", "every", "satisfies", "not", "and", "or",
  "function", "external", "context", "list", "range",
  "instance", "of", "between"
]);

const FEEL_BOOLEANS = new Set(["true", "false"]);

interface FeelState {
  inString: boolean;
  stringChar: string;
}

function mFeelToken(stream: StringStream, state: FeelState): string | null {
  // Handle string continuation
  if (state.inString) {
    while (!stream.eol()) {
      const ch = stream.next();
      if (ch === "\\") {
        stream.next(); // skip escaped char
      } else if (ch === state.stringChar) {
        state.inString = false;
        return "string";
      }
    }
    return "string";
  }

  // Skip whitespace
  if (stream.eatSpace()) return null;

  // Line comment
  if (stream.match("//")) {
    stream.skipToEnd();
    return "comment";
  }

  // Block comment
  if (stream.match("/*")) {
    while (!stream.eol()) {
      if (stream.match("*/")) return "comment";
      stream.next();
    }
    return "comment";
  }

  // String literals
  const ch = stream.peek();
  if (ch === '"' || ch === "'") {
    state.inString = true;
    state.stringChar = ch!;
    stream.next();
    return mFeelToken(stream, state);
  }

  // Numbers
  if (stream.match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/)) {
    return "number";
  }

  // Multi-character operators (must check before single-char)
  if (stream.match("<=") || stream.match(">=") || stream.match("!=") || stream.match("**")) {
    return "operator";
  }

  // Single-character operators
  if (ch && "=<>+-*/".includes(ch)) {
    stream.next();
    return "operator";
  }

  // Brackets / delimiters
  if (ch && "()[]{}".includes(ch)) {
    stream.next();
    return "bracket";
  }

  // Comma, semicolon, colon
  if (ch && ",;:".includes(ch)) {
    stream.next();
    return "punctuation";
  }

  // Dot (member access)
  if (ch === ".") {
    stream.next();
    return "operator";
  }

  // @ for date/time literals
  if (ch === "@") {
    stream.next();
    if (stream.match(/"[^"]*"/)) {
      return "string";
    }
    return "operator";
  }

  // Words: keywords, booleans, null, identifiers
  if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
    const word = stream.current();
    if (word === "null") return "null";
    if (FEEL_BOOLEANS.has(word)) return "bool";
    if (FEEL_KEYWORDS.has(word)) return "keyword";
    // Check if followed by ( => function call
    if (stream.peek() === "(") return "variableName.function";
    return "variableName";
  }

  // Skip unknown character
  stream.next();
  return null;
}

export const feelLanguage = StreamLanguage.define<FeelState>({
  startState(): FeelState {
    return { inString: false, stringChar: "" };
  },
  token: mFeelToken,
  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } }
  }
});
