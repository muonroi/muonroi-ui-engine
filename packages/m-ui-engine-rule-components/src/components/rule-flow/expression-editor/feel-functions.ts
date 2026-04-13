/**
 * FEEL built-in function catalog for autocomplete and function browser.
 * Contains function metadata, signatures, descriptions, and insertion templates.
 */

export type MFeelFunctionGroup = "Math" | "Logic" | "Collection" | "Type" | "String" | "Date";

export interface MFeelFunction {
  name: string;
  signature: string;
  description: string;
  /** Template inserted at cursor — e.g. "sum()" with cursor inside parens */
  template: string;
  group: MFeelFunctionGroup;
}

export const FEEL_BUILTIN_FUNCTIONS: MFeelFunction[] = [
  // ── Math ──────────────────────────────────────────
  { name: "sum", signature: "(list) -> number", description: "Sum of all numbers in a list", template: "sum()", group: "Math" },
  { name: "count", signature: "(list) -> number", description: "Count of elements in a list", template: "count()", group: "Math" },
  { name: "min", signature: "(a, b, ...) -> number", description: "Minimum value", template: "min()", group: "Math" },
  { name: "max", signature: "(a, b, ...) -> number", description: "Maximum value", template: "max()", group: "Math" },
  { name: "mean", signature: "(list) -> number", description: "Arithmetic mean of a list", template: "mean()", group: "Math" },
  { name: "abs", signature: "(n) -> number", description: "Absolute value", template: "abs()", group: "Math" },
  { name: "floor", signature: "(n) -> number", description: "Round down to nearest integer", template: "floor()", group: "Math" },
  { name: "ceiling", signature: "(n) -> number", description: "Round up to nearest integer", template: "ceiling()", group: "Math" },
  { name: "round up", signature: "(n, scale) -> number", description: "Round up to given scale", template: "round up(, )", group: "Math" },
  { name: "round down", signature: "(n, scale) -> number", description: "Round down to given scale", template: "round down(, )", group: "Math" },
  { name: "decimal", signature: "(n, scale) -> number", description: "Round to specified decimal places", template: "decimal(, )", group: "Math" },
  { name: "modulo", signature: "(dividend, divisor) -> number", description: "Remainder of division", template: "modulo(, )", group: "Math" },
  { name: "sqrt", signature: "(n) -> number", description: "Square root", template: "sqrt()", group: "Math" },
  { name: "log", signature: "(n) -> number", description: "Natural logarithm", template: "log()", group: "Math" },
  { name: "exp", signature: "(n) -> number", description: "Euler's number raised to power", template: "exp()", group: "Math" },

  // ── Logic ─────────────────────────────────────────
  { name: "if", signature: "condition then value else alternative", description: "Conditional expression", template: "if  then  else ", group: "Logic" },
  { name: "not", signature: "(value) -> boolean", description: "Logical negation", template: "not()", group: "Logic" },
  { name: "and", signature: "(a, b) -> boolean", description: "Logical conjunction", template: "and(, )", group: "Logic" },
  { name: "or", signature: "(a, b) -> boolean", description: "Logical disjunction", template: "or(, )", group: "Logic" },

  // ── Collection ────────────────────────────────────
  { name: "for", signature: "item in collection return expression", description: "Iterate over collection", template: "for  in  return ", group: "Collection" },
  { name: "some", signature: "item in collection satisfies condition", description: "Existential quantifier", template: "some  in  satisfies ", group: "Collection" },
  { name: "every", signature: "item in collection satisfies condition", description: "Universal quantifier", template: "every  in  satisfies ", group: "Collection" },
  { name: "list contains", signature: "(list, element) -> boolean", description: "Check if list contains element", template: "list contains(, )", group: "Collection" },
  { name: "append", signature: "(list, item) -> list", description: "Append item to list", template: "append(, )", group: "Collection" },
  { name: "concatenate", signature: "(list1, list2) -> list", description: "Concatenate two lists", template: "concatenate(, )", group: "Collection" },
  { name: "flatten", signature: "(list) -> list", description: "Flatten nested list", template: "flatten()", group: "Collection" },
  { name: "distinct values", signature: "(list) -> list", description: "Remove duplicates from list", template: "distinct values()", group: "Collection" },
  { name: "sort", signature: "(list) -> list", description: "Sort list in ascending order", template: "sort()", group: "Collection" },
  { name: "reverse", signature: "(list) -> list", description: "Reverse list order", template: "reverse()", group: "Collection" },
  { name: "index of", signature: "(list, element) -> number", description: "Find index of element in list", template: "index of(, )", group: "Collection" },
  { name: "union", signature: "(list1, list2) -> list", description: "Union of two lists (deduplicated)", template: "union(, )", group: "Collection" },
  { name: "sublist", signature: "(list, start, length) -> list", description: "Extract sublist", template: "sublist(, , )", group: "Collection" },

  // ── Type ──────────────────────────────────────────
  { name: "string", signature: "(value) -> string", description: "Convert value to string", template: "string()", group: "Type" },
  { name: "number", signature: "(from, grouping, decimal) -> number", description: "Parse string to number", template: "number(, , )", group: "Type" },
  { name: "date", signature: "(from) -> date", description: "Parse string to date", template: "date()", group: "Type" },
  { name: "time", signature: "(from) -> time", description: "Parse string to time", template: "time()", group: "Type" },
  { name: "date and time", signature: "(from) -> date-time", description: "Parse string to date-time", template: "date and time()", group: "Type" },
  { name: "duration", signature: "(from) -> duration", description: "Parse string to duration", template: "duration()", group: "Type" },

  // ── String ────────────────────────────────────────
  { name: "string length", signature: "(s) -> number", description: "Length of string", template: "string length()", group: "String" },
  { name: "substring", signature: "(s, start, length) -> string", description: "Extract substring", template: "substring(, , )", group: "String" },
  { name: "upper case", signature: "(s) -> string", description: "Convert to uppercase", template: "upper case()", group: "String" },
  { name: "lower case", signature: "(s) -> string", description: "Convert to lowercase", template: "lower case()", group: "String" },
  { name: "contains", signature: "(s, match) -> boolean", description: "Check if string contains match", template: "contains(, )", group: "String" },
  { name: "starts with", signature: "(s, match) -> boolean", description: "Check if string starts with match", template: "starts with(, )", group: "String" },
  { name: "ends with", signature: "(s, match) -> boolean", description: "Check if string ends with match", template: "ends with(, )", group: "String" },
  { name: "matches", signature: "(s, pattern) -> boolean", description: "Check if string matches regex pattern", template: "matches(, )", group: "String" },
  { name: "replace", signature: "(s, pattern, replacement) -> string", description: "Replace pattern in string", template: "replace(, , )", group: "String" },
  { name: "split", signature: "(s, delimiter) -> list", description: "Split string by delimiter", template: "split(, )", group: "String" },

  // ── Date ──────────────────────────────────────────
  { name: "now", signature: "() -> date-time", description: "Current date and time", template: "now()", group: "Date" },
  { name: "today", signature: "() -> date", description: "Current date", template: "today()", group: "Date" },
  { name: "day of week", signature: "(date) -> string", description: "Day of week name", template: "day of week()", group: "Date" },
  { name: "month of year", signature: "(date) -> string", description: "Month of year name", template: "month of year()", group: "Date" },
  { name: "years and months duration", signature: "(from, to) -> duration", description: "Duration between two dates in years and months", template: "years and months duration(, )", group: "Date" }
];

/** FEEL keywords that should not be flagged as unknown field references */
export const FEEL_KEYWORDS = new Set([
  "true", "false", "null", "if", "then", "else", "for", "in", "return",
  "some", "every", "satisfies", "not", "and", "or", "between",
  "instance", "of", "function"
]);

/** FEEL function names set for quick lookup during validation */
export const FEEL_FUNCTION_NAMES = new Set(
  FEEL_BUILTIN_FUNCTIONS.map((f) => f.name)
);

/** Grouped function catalog for the function browser UI */
export interface MFeelFunctionGroupEntry {
  group: MFeelFunctionGroup;
  functions: MFeelFunction[];
}

export const FEEL_FUNCTION_GROUPS: MFeelFunctionGroupEntry[] = (() => {
  const groupOrder: MFeelFunctionGroup[] = ["Math", "Logic", "Collection", "Type", "String", "Date"];
  const map = new Map<MFeelFunctionGroup, MFeelFunction[]>();
  for (const g of groupOrder) map.set(g, []);
  for (const fn of FEEL_BUILTIN_FUNCTIONS) {
    map.get(fn.group)!.push(fn);
  }
  return groupOrder.map((g) => ({ group: g, functions: map.get(g)! }));
})();
