/**
 * Minimal monaco-editor stub for vitest.
 * Prevents dynamic import() from hitting the real 3 MB bundle in jsdom.
 */

export const KeyCode = {
  Enter: 3,
  Escape: 9
} as const;

export const languages = {
  CompletionItemKind: {
    Text: 18
  },
  register: () => undefined,
  setMonarchTokensProvider: () => undefined,
  registerCompletionItemProvider: () => ({ dispose: () => undefined })
};

export const editor = {
  create: (container: HTMLElement, options?: Record<string, unknown>) => {
    void container;
    void options;
    return {
      focus: () => undefined,
      addCommand: () => undefined,
      onDidBlurEditorText: () => ({ dispose: () => undefined }),
      onDidChangeModelContent: (_cb: () => void) => ({ dispose: () => undefined }),
      getValue: () => "",
      getModel: () => ({
        getValue: () => "",
        setValue: (_v: string) => undefined
      }),
      setValue: (_v: string) => undefined,
      updateOptions: (_opts: Record<string, unknown>) => undefined,
      dispose: () => undefined
    };
  }
};
