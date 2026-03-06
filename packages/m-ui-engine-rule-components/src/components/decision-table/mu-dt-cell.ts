import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

type MonacoModule = typeof import("monaco-editor");

@customElement("mu-dt-cell")
export class MuDtCell extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];
  private static mMonaco?: MonacoModule;
  private static mFeelRegistered = false;

  @property({ type: String })
  rowId = "";

  @property({ type: String })
  columnId = "";

  @property({ type: String })
  value = "";

  @property({ type: Boolean, reflect: true })
  readonlyMode = false;

  @property({ type: String, attribute: "feel-endpoint" })
  feelEndpoint = "/api/v1/feel/autocomplete";

  @property({ type: String, attribute: "data-type" })
  dataType = "string";

  @property({ type: Boolean, attribute: "has-error" })
  hasError = false;

  @state()
  private mIsEditing = false;

  @query("#editor-host")
  private mEditorHost?: HTMLDivElement;

  private mDraftValue = "";
  private mEditor?: import("monaco-editor").editor.IStandaloneCodeEditor;
  private mBlurSubscription?: import("monaco-editor").IDisposable;

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("mIsEditing")) {
      if (this.mIsEditing) {
        void this.MInitEditorAsync();
      } else {
        this.MDisposeEditor();
      }
    }
  }

  disconnectedCallback(): void {
    this.MDisposeEditor();
    super.disconnectedCallback();
  }

  private MBeginEdit(): void {
    if (this.readonlyMode) {
      return;
    }

    this.mDraftValue = this.value;
    this.mIsEditing = true;
  }

  private async MInitEditorAsync(): Promise<void> {
    if (!this.mEditorHost) {
      return;
    }

    const monaco = await this.MGetMonacoAsync();
    if (!MuDtCell.mFeelRegistered) {
      this.MRegisterFeel(monaco);
      MuDtCell.mFeelRegistered = true;
    }

    this.mEditor = monaco.editor.create(this.mEditorHost, {
      value: this.mDraftValue,
      language: "feel",
      minimap: { enabled: false },
      automaticLayout: true,
      scrollbar: {
        vertical: "hidden",
        horizontal: "hidden"
      },
      lineNumbers: "off",
      fontSize: 13
    });

    this.mEditor.focus();
    this.mEditor.addCommand(monaco.KeyCode.Enter, () => this.MCommit());
    this.mEditor.addCommand(monaco.KeyCode.Escape, () => this.MDiscard());
    this.mBlurSubscription = this.mEditor.onDidBlurEditorText(() => this.MCommit());
  }

  private async MGetMonacoAsync(): Promise<MonacoModule> {
    if (!MuDtCell.mMonaco) {
      MuDtCell.mMonaco = (await import("monaco-editor")) as MonacoModule;
    }

    return MuDtCell.mMonaco;
  }

  private MRegisterFeel(monaco: MonacoModule): void {
    monaco.languages.register({ id: "feel" });
    monaco.languages.setMonarchTokensProvider("feel", {
      tokenizer: {
        root: [
          [/\b(if|then|else|in|and|or|not|between|instance of|some|every|satisfies)\b/, "keyword"],
          [/\[[^\]]*\.\.[^\]]*\]/, "number"],
          [/-?\d+(\.\d+)?/, "number"],
          [/\"([^\"\\]|\\.)*\"/, "string"]
        ]
      }
    });

    monaco.languages.registerCompletionItemProvider("feel", {
      triggerCharacters: [" ", ".", "("],
      provideCompletionItems: async (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const value = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const response = await fetch(this.feelEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partialExpression: value,
            dataType: this.dataType
          })
        }).catch(() => undefined);

        if (!response?.ok) {
          return { suggestions: [] };
        }

        const payload = (await response.json()) as { suggestions?: string[] };
        return {
          suggestions: (payload.suggestions ?? []).map((item) => ({
            label: item,
            kind: monaco.languages.CompletionItemKind.Text,
            insertText: item,
            range
          }))
        };
      }
    });
  }

  private MCommit(): void {
    const next = this.mEditor?.getValue() ?? this.mDraftValue;
    this.value = next;
    this.dispatchEvent(
      new CustomEvent<{ rowId: string; columnId: string; value: string }>("cell-change", {
        detail: {
          rowId: this.rowId,
          columnId: this.columnId,
          value: this.value
        },
        bubbles: true,
        composed: true
      })
    );
    this.mIsEditing = false;
  }

  private MDiscard(): void {
    this.value = this.mDraftValue;
    this.mIsEditing = false;
  }

  private MDisposeEditor(): void {
    this.mBlurSubscription?.dispose();
    this.mBlurSubscription = undefined;
    this.mEditor?.dispose();
    this.mEditor = undefined;
  }

  render() {
    if (this.mIsEditing) {
      return html`
        <div class="relative min-h-9 rounded border border-[var(--color-mu-primary)] bg-white">
          <div id="editor-host" class="h-24 w-full"></div>
        </div>
      `;
    }

    return html`
      <button
        class="min-h-9 w-full rounded border px-2 py-1 text-left text-sm ${this.hasError
          ? "border-red-400 bg-red-50"
          : "border-[var(--color-mu-border)] bg-white"}"
        @dblclick=${this.MBeginEdit}
      >
        ${this.value}
      </button>
    `;
  }
}

