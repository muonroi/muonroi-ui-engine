import { LitElement, html, unsafeCSS } from "lit";
import { MuBaseElement } from "./mu-base-element.js";
import { customElement, property } from "lit/decorators.js";
import { MSchemaNotifier } from "../../services/schema-notifier.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-schema-watcher")
export class MuSchemaWatcher extends MuBaseElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "hub-url" })
  hubUrl = "/hubs/ui-engine";

  private mNotifier: MSchemaNotifier | null = null;

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    this.mNotifier = new MSchemaNotifier({ hubUrl: this.hubUrl });
    this.mNotifier.MOnSchemaChanged((schemaHash) => {
      this.dispatchEvent(
        new CustomEvent<{ schemaHash?: string }>("schema-changed", {
          detail: { schemaHash },
          bubbles: true,
          composed: true
        })
      );
    });

    await this.mNotifier.MStart().catch(() => undefined);
  }

  disconnectedCallback(): void {
    void this.mNotifier?.MStop();
    this.mNotifier = null;
    super.disconnectedCallback();
  }

  render() {
    return html`<span class="hidden"></span>`;
  }
}
