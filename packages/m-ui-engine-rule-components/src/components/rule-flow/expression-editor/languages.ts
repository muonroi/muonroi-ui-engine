/**
 * Language registry mapping MRuleFlowExpressionLanguage to CodeMirror 6 extensions.
 * Provides mGetLanguageExtension() for dynamic language switching via Compartment.
 */
import type { Extension } from "@codemirror/state";
import type { MRuleFlowExpressionLanguage } from "../../../models.js";
import { feelLanguage } from "./lang-feel.js";
import { liquidLanguage } from "./lang-liquid.js";
import { scribanLanguage } from "./lang-scriban.js";
import { javascript } from "@codemirror/lang-javascript";

/**
 * Returns the CodeMirror language extension for the given expression language.
 * Used with a Compartment to allow runtime language switching without editor recreation.
 */
export function mGetLanguageExtension(language: MRuleFlowExpressionLanguage): Extension {
  switch (language) {
    case "feel":
      return feelLanguage;
    case "liquid":
      return liquidLanguage;
    case "scriban":
      return scribanLanguage;
    case "javascript":
      return javascript();
    case "plain-text":
      return [];
  }
}
