/**
 * CodeMirror 6 React wrapper for editing rule flow expressions.
 * Supports value sync, read-only mode, imperative token insertion,
 * and shadow DOM rendering via the `root` option.
 */
import React, { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, crosshairCursor, rectangularSelection, placeholder } from "@codemirror/view";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, syntaxHighlighting } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import type { MRuleFlowExpressionLanguage } from "../../../models.js";
import { mGetLanguageExtension } from "./languages.js";

export interface MExpressionEditorProps {
  /** Current expression body */
  value: string;
  /** Current language mode */
  language: MRuleFlowExpressionLanguage;
  /** Maps to EditorState.readOnly */
  readOnly: boolean;
  /** Called on editor content change */
  onChange: (value: string) => void;
  /** Exposes imperative insert method for click-to-insert (called once on mount) */
  onInsertToken?: (ref: { insert: (text: string) => void }) => void;
  /** Additional extensions (autocomplete, lint, language support injected by parent) */
  extensions?: Extension[];
  /** Minimum height in pixels — default 180 (matches current textarea) */
  minHeight?: number;
  /** Shadow root or document for CodeMirror style injection */
  root?: Document | ShadowRoot;
  /** Single-line inline mode — no line numbers, no gutter, compact height (default false) */
  singleLine?: boolean;
  /** Placeholder text shown when editor is empty */
  placeholderText?: string;
}

const mReadOnlyCompartment = new Compartment();
const mLanguageCompartment = new Compartment();
const mThemeCompartment = new Compartment();
const mExtraCompartment = new Compartment();

export function MExpressionEditor({
  value,
  language,
  readOnly,
  onChange,
  onInsertToken,
  extensions: extraExtensions,
  minHeight: minHeightProp,
  root,
  singleLine = false,
  placeholderText
}: MExpressionEditorProps) {
  const minHeight = minHeightProp ?? (singleLine ? 36 : 180);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onInsertTokenRef = useRef(onInsertToken);

  // Keep refs up to date without triggering effects
  onChangeRef.current = onChange;
  onInsertTokenRef.current = onInsertToken;

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const baseExtensions: Extension[] = [
      ...(singleLine ? [] : [lineNumbers(), highlightActiveLine()]),
      drawSelection(),
      rectangularSelection(),
      crosshairCursor(),
      bracketMatching(),
      closeBrackets(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      mReadOnlyCompartment.of([
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly)
      ]),
      mLanguageCompartment.of(mGetLanguageExtension(language)),
      mThemeCompartment.of([]),
      mExtraCompartment.of(extraExtensions ?? []),
      ...(singleLine ? [
        EditorView.theme({
          "&": { maxHeight: `${minHeight}px` },
          ".cm-scroller": { overflow: "hidden" },
          ".cm-content": { padding: "4px 8px" },
          ".cm-gutters": { display: "none" }
        }),
        EditorState.transactionFilter.of(tr => tr.newDoc.lines > 1 ? [] : tr)
      ] : []),
      ...(placeholderText ? [placeholder(placeholderText)] : [])
    ];

    const state = EditorState.create({
      doc: value,
      extensions: baseExtensions
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
      root: root as (Document | ShadowRoot | undefined)
    });

    viewRef.current = view;

    // Expose imperative insert method
    if (onInsertTokenRef.current) {
      onInsertTokenRef.current({
        insert: (text: string) => {
          const pos = view.state.selection.main.head;
          view.dispatch({
            changes: { from: pos, insert: text },
            selection: { anchor: pos + text.length }
          });
          view.focus();
        }
      });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  // Sync value from external changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value }
      });
    }
  }, [value]);

  // Sync language via compartment — switch highlighting without editor recreation
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: mLanguageCompartment.reconfigure(mGetLanguageExtension(language))
    });
  }, [language]);

  // Sync readOnly via compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: mReadOnlyCompartment.reconfigure([
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly)
      ])
    });
  }, [readOnly]);

  // Sync extra extensions via compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: mExtraCompartment.reconfigure(extraExtensions ?? [])
    });
  }, [extraExtensions]);

  const containerStyle: React.CSSProperties = {
    minHeight: `${minHeight}px`,
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: singleLine ? "6px" : "14px",
    overflow: "hidden",
    ...(singleLine ? { marginBottom: 0 } : {})
  };

  return <div ref={containerRef} style={containerStyle} />;
}
