import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { MRenderCommercialLicenseGate } from "../../license/m-commercial-guard.js";
import tailwindStyles from "../../styles/tailwind.css?inline";
import xyflowStyles from "../../styles/xyflow.css?inline";
import type { MRuleFlowGraph } from "../../models.js";
import { MCreateEmptyRuleFlowGraph } from "../../models.js";
import { MBuildRuleComponentHeaders } from "../../runtime/request-context.js";
import { MuRuleFlowEditor } from "./MuRuleFlowEditor.js";
import { MCreateRuleFlowGraphSignature, MEnsureRuleFlowGraph } from "./rule-flow-runtime.js";
import { MRuleFlowGraphConverter } from "../../utils/m-rule-flow-graph-converter.js";

const M_FEATURE_KEY = "rule-flow-designer";
type MRuleStudioPublishDetail = { graph: MRuleFlowGraph; ruleSet: Record<string, unknown> };

@customElement("mu-rule-flow-designer")
export class MuRuleFlowDesigner extends LitElement {
  static styles = [unsafeCSS(tailwindStyles), unsafeCSS(xyflowStyles)];

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

  @property({ type: String, attribute: "workflow-code" })
  workflowCode = "";

  @property({ type: String, attribute: "tenant-id" })
  tenantId = "";

  private mRoot?: Root;
  private mInternalGraphUpdate = false;
  private mLastGraphSignature = MCreateRuleFlowGraphSignature(this.graph);
  private mWorkflowLoadVersion = 0;
  private mLoadedRuleSet: Record<string, unknown> | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.MUpgradeProperty("graph");
    this.MUpgradeProperty("graphJson");
    this.MUpgradeProperty("readOnly");
    this.MUpgradeProperty("theme");
    this.MUpgradeProperty("apiBaseUrl");
    this.MUpgradeProperty("height");
    this.MUpgradeProperty("workflowCode");
    this.MUpgradeProperty("tenantId");
    this.MSyncGraphFromJson();
  }

  firstUpdated(): void {
    queueMicrotask(() => {
      this.MRenderEditor();
      if (!this.graphJson.trim()) {
        void this.MLoadWorkflowGraphAsync();
      }
    });
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has("graphJson") && !this.mInternalGraphUpdate && this.MSyncGraphFromJsonIfNeeded()) {
      this.MRenderEditor();
      return;
    }

    if (!this.mInternalGraphUpdate && (changed.has("graph") || changed.has("graphJson") || changed.has("readOnly") || changed.has("theme") || changed.has("apiBaseUrl") || changed.has("height") || changed.has("tenantId"))) {
      this.MRenderEditor();
    }

    if ((changed.has("workflowCode") || changed.has("apiBaseUrl") || changed.has("tenantId")) && !this.graphJson.trim()) {
      void this.MLoadWorkflowGraphAsync();
    }

    if (this.mInternalGraphUpdate && (changed.has("graphJson") || changed.has("graph"))) {
      this.mInternalGraphUpdate = false;
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

  private MUpgradeProperty(name: string): void {
    if (!Object.prototype.hasOwnProperty.call(this, name)) {
      return;
    }

    const value = Reflect.get(this, name);
    Reflect.deleteProperty(this, name);
    Reflect.set(this, name, value);
  }

  private MSyncGraphFromJson(): void {
    if (!this.graphJson.trim()) {
      this.graph = MEnsureRuleFlowGraph(this.graph);
      this.mLastGraphSignature = MCreateRuleFlowGraphSignature(this.graph);
      return;
    }

    try {
      this.graph = MEnsureRuleFlowGraph(JSON.parse(this.graphJson));
      this.mLastGraphSignature = MCreateRuleFlowGraphSignature(this.graph);
    } catch {
      this.graph = MCreateEmptyRuleFlowGraph();
      this.mLastGraphSignature = MCreateRuleFlowGraphSignature(this.graph);
    }
  }

  private MSyncGraphFromJsonIfNeeded(): boolean {
    if (!this.graphJson.trim()) {
      return false;
    }

    try {
      const nextGraph = MEnsureRuleFlowGraph(JSON.parse(this.graphJson));
      const nextSignature = MCreateRuleFlowGraphSignature(nextGraph);
      if (nextSignature === this.mLastGraphSignature) {
        return false;
      }

      this.graph = nextGraph;
      this.mLastGraphSignature = nextSignature;
      return true;
    } catch {
      return false;
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
        tenantId: this.tenantId || undefined,
        workflowCode: this.workflowCode || undefined,
        height: this.height,
        onGraphChange: (nextGraph: MRuleFlowGraph) => {
          const nextSignature = MCreateRuleFlowGraphSignature(nextGraph);
          if (nextSignature === this.mLastGraphSignature) {
            return;
          }

          this.mInternalGraphUpdate = true;
          this.graph = nextGraph;
          this.mLastGraphSignature = nextSignature;
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
          const ruleSet = MRuleFlowGraphConverter.toRuleSet(nextGraph, this.mLoadedRuleSet ?? undefined);
          this.mLoadedRuleSet = ruleSet;
          this.dispatchEvent(
            new CustomEvent<MRuleStudioPublishDetail>("publish", {
              detail: {
                graph: nextGraph,
                ruleSet
              },
              bubbles: true,
              composed: true
            })
          );
        }
      })
    );
  }

  private async MLoadWorkflowGraphAsync(): Promise<void> {
    const workflowCode = this.workflowCode.trim();
    const apiBaseUrl = this.apiBaseUrl.trim();
    if (!workflowCode || !apiBaseUrl || this.graphJson.trim()) {
      return;
    }

    const currentVersion = ++this.mWorkflowLoadVersion;
    const exportUrl = `${apiBaseUrl.replace(/\/$/, "")}/rulesets/${encodeURIComponent(workflowCode)}/export`;

    try {
      const response = await fetch(exportUrl, {
        headers: MBuildRuleComponentHeaders(undefined, { tenantId: this.tenantId })
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { ruleSetJson?: string };
      if (currentVersion != this.mWorkflowLoadVersion || !payload.ruleSetJson) {
        return;
      }

      const ruleSet = JSON.parse(payload.ruleSetJson);
      this.mLoadedRuleSet = ruleSet;
      const nextGraph = MEnsureRuleFlowGraph(MRuleFlowGraphConverter.fromRuleSet(ruleSet));
      this.mInternalGraphUpdate = true;
      this.graph = nextGraph;
      this.mLastGraphSignature = MCreateRuleFlowGraphSignature(nextGraph);
      this.graphJson = JSON.stringify(nextGraph);
    } catch {
      // Leave the current graph untouched when the workflow export is unavailable.
    }
  }
}
