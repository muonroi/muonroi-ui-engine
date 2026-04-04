/**
 * Lightweight registration entry point — only registers trace/result
 * web components. Excludes Monaco editor, React, and XYFlow dependencies.
 * Suitable for use as a standalone IIFE in Angular and other host apps.
 */
import "./components/trace-viewer/mu-rule-trace-viewer.js";
import "./components/result-panel/mu-rule-result-panel.js";
