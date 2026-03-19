/**
 * CodeMirror 6 autocomplete extension for FEEL expressions.
 * Provides completions from upstream FactBag scope fields and FEEL built-in functions.
 * Triggers on `.` (dot) for child field navigation and on Ctrl+Space for all completions.
 */
import { autocompletion, type CompletionContext, type CompletionResult, type Completion } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import type { MRuleFlowContractField } from "../../../models/rule-flow.js";
import { MFlattenContractFields } from "../rule-flow-helpers.js";
import { FEEL_BUILTIN_FUNCTIONS } from "./feel-functions.js";

/**
 * Create a CodeMirror autocomplete extension for FEEL expressions.
 * @param fields - Upstream contract fields (from FactBag scope)
 * @returns CodeMirror Extension providing autocomplete
 */
export function mCreateFeelAutocomplete(fields: MRuleFlowContractField[]): Extension {
  const completionSource = (context: CompletionContext): CompletionResult | null => {
    const flatFields = MFlattenContractFields(fields);

    // ── Dot trigger: show child fields ──────────────────
    const beforeCursor = context.state.sliceDoc(0, context.pos);
    const dotMatch = beforeCursor.match(/([a-zA-Z_][\w.]*)\.$/);
    if (dotMatch) {
      const parentPath = dotMatch[1];
      // Find children of the parent field
      const childCompletions: Completion[] = [];
      for (const field of flatFields) {
        if (field.path.startsWith(parentPath + ".") && !field.path.substring(parentPath.length + 1).includes(".")) {
          childCompletions.push({
            label: field.path,
            type: "variable",
            detail: field.dataType,
            info: field.sourceNodeLabel ? `From: ${field.sourceNodeLabel}` : undefined,
            boost: 2
          });
        }
      }
      if (childCompletions.length > 0) {
        return {
          from: context.pos - parentPath.length - 1,
          options: childCompletions,
          validFor: /^[\w.]*$/
        };
      }
    }

    // ── Word trigger: match identifier pattern ──────────
    const word = context.matchBefore(/[a-zA-Z_][\w.]*/);
    if (!word && !context.explicit) return null;

    const from = word ? word.from : context.pos;

    // Field completions
    const fieldCompletions: Completion[] = flatFields.map((field) => ({
      label: field.path,
      type: "variable",
      detail: field.dataType,
      info: field.sourceNodeLabel ? `From: ${field.sourceNodeLabel}` : undefined,
      boost: 1
    }));

    // FEEL function completions
    const functionCompletions: Completion[] = FEEL_BUILTIN_FUNCTIONS.map((func) => ({
      label: func.name,
      type: "function",
      detail: func.signature,
      info: func.description,
      apply: func.template,
      boost: 0
    }));

    return {
      from,
      options: [...fieldCompletions, ...functionCompletions],
      validFor: /^[\w.]*$/
    };
  };

  return autocompletion({
    override: [completionSource],
    activateOnTyping: true
  });
}
