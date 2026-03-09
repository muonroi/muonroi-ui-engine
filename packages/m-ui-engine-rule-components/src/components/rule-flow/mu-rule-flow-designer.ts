import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { MRenderCommercialLicenseGate } from "../../license/m-commercial-guard.js";
import tailwindStyles from "../../styles/tailwind.css?inline";
import type { MRuleFlowGraph } from "../../models.js";
import { MCreateEmptyRuleFlowGraph } from "../../models.js";
import { MEnsureRuleFlowGraph, MuRuleFlowEditor } from "./MuRuleFlowEditor.js";

const M_FEATURE_KEY = "rule-flow-designer";

@customElement("mu-rule-flow-designer")
export class MuRuleFlowDesigner extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ attribute: false })
  graph: MRuleFlowGraph = MCreateEmptyRuleFlowGraph();

  @property({ type: String, attribute: "graph-json" })
  graphJson = "";

  @property({ type: Boolean, attribute: "read-only" })
  readOnly = false;

  @property({ type: String })
  theme: "light" | "dark" = "light";

  @property({ type: String, attribute: "api-base-url" })
  apiBaseUrl = "";

  @property({ type: Number })
  height = 640;

  private mRoot?: Root;

  connectedCallback(): void {
    super.connectedCallback();
    this.MSyncGraphFromJson();
  }

  firstUpdated(): void {
    this.MRenderEditor();
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has("graphJson") && !changed.has("graph")) {
      this.MSyncGraphFromJson();
    }

    if (changed.has("graph") || changed.has("graphJson") || changed.has("readOnly") || changed.has("theme") || changed.has("apiBaseUrl")) {
      this.MRenderEditor();
    }
  }

  disconnectedCallback(): void {
    this.mRoot?.unmount();
    this.mRoot = undefined;
    super.disconnectedCallback();
  }

  render() {
    const gate = MRenderCommercialLicenseGate(M_FEATURE_KEY);
    if (gate) {
      return gate;
    }

    return html`<section id="editor-host" class="block h-full min-h-[640px] w-full"></section>`;
  }

  private MSyncGraphFromJson(): void {
    if (!this.graphJson.trim()) {
      if (this.graph.nodes.length === 0 && this.graph.edges.length === 0) {
        this.graph = MCreateEmptyRuleFlowGraph();
      }
      return;
    }

    try {
      this.graph = MEnsureRuleFlowGraph(JSON.parse(this.graphJson));
    } catch {
      this.graph = MCreateEmptyRuleFlowGraph();
    }
  }

  private MRenderEditor(): void {
    const gate = MRenderCommercialLicenseGate(M_FEATURE_KEY);
    if (gate) {
      this.mRoot?.unmount();
      this.mRoot = undefined;
      return;
    }

    const host = this.renderRoot?.querySelector<HTMLElement>("#editor-host");
    if (!host) {
      return;
    }

    this.mRoot ??= createRoot(host);
    this.mRoot.render(
      createElement(MuRuleFlowEditor, {
        graph: this.graph,
        readOnly: this.readOnly,
        theme: this.theme,
        apiBaseUrl: this.apiBaseUrl || undefined,
        height: this.height,
        onGraphChange: (nextGraph: MRuleFlowGraph) => {
          this.graph = nextGraph;
          this.graphJson = JSON.stringify(nextGraph);
          this.dispatchEvent(
            new CustomEvent<MRuleFlowGraph>("graph-change", {
              detail: nextGraph,
              bubbles: true,
              composed: true
            })
          );
        },
        onPublish: async (nextGraph: MRuleFlowGraph) => {
          this.dispatchEvent(
            new CustomEvent<MRuleFlowGraph>("publish", {
              detail: nextGraph,
              bubbles: true,
              composed: true
            })
          );
        }
      })
    );
  }
}
