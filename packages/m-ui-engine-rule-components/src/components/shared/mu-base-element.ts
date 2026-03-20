import { LitElement } from "lit";
import { MInjectHostTokens } from "../../styles/m-host-tokens.js";

/**
 * Base element for all mu-* components.
 * Injects :host design tokens at runtime to work around LightningCSS
 * stripping :host selectors during Vite dependency pre-bundling.
 */
export class MuBaseElement extends LitElement {
  connectedCallback(): void {
    super.connectedCallback();
    if (this.shadowRoot) {
      MInjectHostTokens(this.shadowRoot);
    }
  }
}
