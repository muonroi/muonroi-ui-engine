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
  create: () => ({
    focus: () => undefined,
    addCommand: () => undefined,
    onDidBlurEditorText: () => ({ dispose: () => undefined }),
    getValue: () => "",
    dispose: () => undefined
  })
};
