/**
 * CodeMirror 6 lint extension for FEEL expressions.
 * Provides client-side validation: bracket matching, unclosed strings,
 * unknown field references, and empty expression detection.
 * Runs on a 300ms debounce — does NOT call BE validation on every keystroke.
 */
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { MRuleFlowContractField } from "../../../models/rule-flow.js";
import { MFlattenContractFields } from "../rule-flow-helpers.js";
import { FEEL_KEYWORDS, FEEL_FUNCTION_NAMES } from "./feel-functions.js";

/**
 * Create a CodeMirror linter extension for FEEL expressions.
 * @param fields - Upstream contract fields for scope checking
 * @returns CodeMirror Extension with lint + lint gutter (300ms debounce)
 */
export function mCreateFeelLinter(fields: MRuleFlowContractField[]): Extension {
  const lintSource = (view: EditorView): Diagnostic[] => {
    const doc = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    // ── Empty expression ────────────────────────────────
    if (!doc.trim()) {
      diagnostics.push({
        from: 0,
        to: doc.length || 0,
        severity: "info",
        message: "Expression is empty"
      });
      return diagnostics;
    }

    // ── Bracket matching ────────────────────────────────
    const pairs: Array<[string, string]> = [["(", ")"], ["[", "]"], ["{", "}"]];
    for (const [open, close] of pairs) {
      const stack: number[] = [];
      for (let i = 0; i < doc.length; i++) {
        // Skip characters inside strings
        if (doc[i] === '"') {
          i++;
          while (i < doc.length && doc[i] !== '"') {
            if (doc[i] === "\\") i++; // skip escaped char
            i++;
          }
          continue;
        }
        if (doc[i] === open) {
          stack.push(i);
        } else if (doc[i] === close) {
          if (stack.length > 0) {
            stack.pop();
          } else {
            diagnostics.push({
              from: i,
              to: i + 1,
              severity: "error",
              message: `Unmatched closing '${close}'`
            });
          }
        }
      }
      for (const pos of stack) {
        diagnostics.push({
          from: pos,
          to: pos + 1,
          severity: "error",
          message: `Unmatched opening '${open}'`
        });
      }
    }

    // ── Unclosed strings ────────────────────────────────
    let inString = false;
    let stringStart = 0;
    for (let i = 0; i < doc.length; i++) {
      if (doc[i] === '"' && (i === 0 || doc[i - 1] !== "\\")) {
        if (!inString) {
          inString = true;
          stringStart = i;
        } else {
          inString = false;
        }
      }
    }
    if (inString) {
      diagnostics.push({
        from: stringStart,
        to: stringStart + 1,
        severity: "error",
        message: "Unclosed string literal"
      });
    }

    // ── Field reference check ───────────────────────────
    const flatFields = MFlattenContractFields(fields);
    const fieldPaths = new Set(flatFields.map((f) => f.path));
    // Match identifiers (including dotted paths)
    const tokenRegex = /[a-zA-Z_][\w]*/g;
    let match: RegExpExecArray | null;
    // Track which positions are inside strings to skip them
    const stringRanges: Array<[number, number]> = [];
    let sStart = -1;
    for (let i = 0; i < doc.length; i++) {
      if (doc[i] === '"' && (i === 0 || doc[i - 1] !== "\\")) {
        if (sStart < 0) {
          sStart = i;
        } else {
          stringRanges.push([sStart, i]);
          sStart = -1;
        }
      }
    }

    const isInString = (pos: number): boolean =>
      stringRanges.some(([s, e]) => pos >= s && pos <= e);

    while ((match = tokenRegex.exec(doc)) !== null) {
      const token = match[0];
      const tokenStart = match.index;

      // Skip tokens inside strings
      if (isInString(tokenStart)) continue;

      // Skip FEEL keywords
      if (FEEL_KEYWORDS.has(token)) continue;

      // Skip FEEL built-in function names (including multi-word)
      if (FEEL_FUNCTION_NAMES.has(token)) continue;

      // Skip numbers-only-looking tokens (e.g., after a dot in a number)
      if (/^\d/.test(token)) continue;

      // Build full dotted path from this position
      let fullPath = token;
      let nextPos = tokenStart + token.length;
      while (nextPos < doc.length && doc[nextPos] === ".") {
        const afterDot = doc.substring(nextPos + 1);
        const nextWord = afterDot.match(/^[a-zA-Z_][\w]*/);
        if (nextWord) {
          fullPath += "." + nextWord[0];
          nextPos = nextPos + 1 + nextWord[0].length;
          // Advance regex past the dotted path so we don't re-check sub-tokens
          tokenRegex.lastIndex = nextPos;
        } else {
          break;
        }
      }

      // Check if full path or any prefix matches a known field
      if (fieldPaths.has(fullPath)) continue;

      // Check if this is a prefix of a known field (e.g., "input" when "input.amount" exists)
      let isPrefix = false;
      for (const fp of fieldPaths) {
        if (fp.startsWith(fullPath + ".") || fullPath.startsWith(fp + ".")) {
          isPrefix = true;
          break;
        }
      }
      if (isPrefix) continue;

      // Check single token against field paths (first segment match)
      let firstSegmentMatch = false;
      for (const fp of fieldPaths) {
        if (fp === token || fp.startsWith(token + ".")) {
          firstSegmentMatch = true;
          break;
        }
      }
      if (firstSegmentMatch) continue;

      diagnostics.push({
        from: tokenStart,
        to: tokenStart + fullPath.length,
        severity: "warning",
        message: `Unknown field reference: ${fullPath}`
      });
    }

    return diagnostics;
  };

  return [
    linter(lintSource, { delay: 300 }),
    lintGutter()
  ];
}
