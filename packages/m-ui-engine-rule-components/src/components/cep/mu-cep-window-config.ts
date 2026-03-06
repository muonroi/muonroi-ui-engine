import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-cep-window-config")
export class MuCepWindowConfig extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "window-types" })
  windowTypes = "Sliding,Tumbling";

  @state()
  private mWindowType = "Sliding";

  @state()
  private mWindowSize = 60;

  @state()
  private mTtl = 300;

  private MSave(): void {
    this.dispatchEvent(
      new CustomEvent("save", {
        detail: {
          windowType: this.mWindowType,
          windowSizeSeconds: this.mWindowSize,
          timeToLiveSeconds: this.mTtl
        },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    const options = this.windowTypes.split(",").map((item) => item.trim()).filter(Boolean);
    return html`
      <section class="space-y-3 rounded-lg border border-[var(--color-mu-border)] bg-white p-4">
        <h3 class="text-lg font-semibold">CEP Window Config</h3>
        <label class="block text-sm">Window type
          <select class="mt-1 w-full rounded border border-[var(--color-mu-border)] px-2 py-1" .value=${this.mWindowType} @change=${(e: Event) => (this.mWindowType = (e.target as HTMLSelectElement).value)}>
            ${options.map((option) => html`<option value=${option}>${option}</option>`)}
          </select>
        </label>
        <label class="block text-sm">Window size (seconds)
          <input type="number" class="mt-1 w-full rounded border border-[var(--color-mu-border)] px-2 py-1" .value=${String(this.mWindowSize)} @input=${(e: Event) => (this.mWindowSize = Number((e.target as HTMLInputElement).value || 0))} />
        </label>
        <label class="block text-sm">TTL (seconds)
          <input type="number" class="mt-1 w-full rounded border border-[var(--color-mu-border)] px-2 py-1" .value=${String(this.mTtl)} @input=${(e: Event) => (this.mTtl = Number((e.target as HTMLInputElement).value || 0))} />
        </label>
        <button class="rounded bg-[var(--color-mu-primary)] px-3 py-1 text-sm text-white" @click=${this.MSave}>Save</button>
      </section>
    `;
  }
}

