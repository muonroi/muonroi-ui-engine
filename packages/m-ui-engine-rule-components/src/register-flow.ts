/**
 * Flow-designer IIFE entry point — includes flow designer + trace/result components.
 * Excludes: decision-table (Monaco dependency causes dynamic import() in IIFE format).
 * Output: dist/muonroi-flow-components.iife.js (~1-2MB)
 */
import "./components/rule-flow/mu-rule-flow-designer.js";
import "./components/trace-viewer/mu-rule-trace-viewer.js";
import "./components/result-panel/mu-rule-result-panel.js";
