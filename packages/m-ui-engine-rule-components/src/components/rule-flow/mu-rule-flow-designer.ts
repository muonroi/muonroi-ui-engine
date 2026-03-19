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
type MRuleStudioPublishResultDetail = MRuleStudioPublishDetail & {
  savedVersion: number;
  activeVersion?: number | null;
  approvalWorkflowEnabled: boolean;
  activated: boolean;
  status?: string;
  message: string;
};
type MSaveRuleSetResponse = {
  savedVersion?: number;
  activeVersion?: number | null;
  activated?: boolean;
  status?: string;
  approvalWorkflowEnabled?: boolean;
};

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

  @property({ type: String, attribute: "catalog-api-base" })
  catalogApiBase = "";

  @property({ type: Number })
  height = 640;

  @property({ type: String, attribute: "workflow-code" })
  workflowCode = "";

  @property({ type: String, attribute: "tenant-id" })
  tenantId = "";

  @property({ type: Boolean, attribute: "show-header" })
  showHeader = true;

  @property({ type: Number })
  version: number | null = null;

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
    this.MUpgradeProperty("catalogApiBase");
    this.MUpgradeProperty("height");
    this.MUpgradeProperty("workflowCode");
    this.MUpgradeProperty("tenantId");
    this.MUpgradeProperty("showHeader");
    this.MUpgradeProperty("version");
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

    if (!this.mInternalGraphUpdate && (changed.has("graph") || changed.has("graphJson") || changed.has("readOnly") || changed.has("theme") || changed.has("apiBaseUrl") || changed.has("catalogApiBase") || changed.has("height") || changed.has("tenantId") || changed.has("showHeader") || changed.has("version"))) {
      this.MRenderEditor();
    }

    if (changed.has("version") && this.graphJson.trim()) {
      this.mInternalGraphUpdate = true;
      this.graphJson = "";
      this.graph = MCreateEmptyRuleFlowGraph();
      this.mLastGraphSignature = MCreateRuleFlowGraphSignature(this.graph);
    }

    if ((changed.has("workflowCode") || changed.has("apiBaseUrl") || changed.has("tenantId") || changed.has("version")) && !this.graphJson.trim()) {
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
        catalogApiBase: this.catalogApiBase || undefined,
        tenantId: this.tenantId || undefined,
        workflowCode: this.workflowCode || undefined,
        height: this.height,
        showHeader: this.showHeader,
        version: this.version,
        editorRoot: this.renderRoot as ShadowRoot,
        onVersionChange: (nextVersion: number | null) => {
          this.version = nextVersion;
          this.dispatchEvent(
            new CustomEvent<{ version: number | null }>("version-change", {
              detail: { version: nextVersion },
              bubbles: true,
              composed: true
            })
          );
        },
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
          await this.MPublishGraphAsync(nextGraph);
        }
      })
    );
  }

  private async MPublishGraphAsync(nextGraph: MRuleFlowGraph): Promise<void> {
    const ruleSet = MRuleFlowGraphConverter.toRuleSet(nextGraph, this.mLoadedRuleSet ?? undefined);
    this.mLoadedRuleSet = ruleSet;
    const detail: MRuleStudioPublishDetail = { graph: nextGraph, ruleSet };

    this.dispatchEvent(
      new CustomEvent<MRuleStudioPublishDetail>("publish-start", {
        detail,
        bubbles: true,
        composed: true
      })
    );

    if (!this.apiBaseUrl.trim() || !this.workflowCode.trim()) {
      this.dispatchEvent(
        new CustomEvent<MRuleStudioPublishDetail>("publish", {
          detail,
          bubbles: true,
          composed: true
        })
      );
      return;
    }

    try {
      const result = await this.MPersistRuleSetAsync(detail);
      this.dispatchEvent(
        new CustomEvent<MRuleStudioPublishResultDetail>("publish-complete", {
          detail: result,
          bubbles: true,
          composed: true
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rule Studio publish failed.";
      this.dispatchEvent(
        new CustomEvent<{ message: string; graph: MRuleFlowGraph; ruleSet: Record<string, unknown> }>("publish-error", {
          detail: {
            message,
            graph: nextGraph,
            ruleSet
          },
          bubbles: true,
          composed: true
        })
      );
      throw error;
    }
  }

  private async MPersistRuleSetAsync(detail: MRuleStudioPublishDetail): Promise<MRuleStudioPublishResultDetail> {
    const workflowCode = this.workflowCode.trim();
    const baseUrl = this.apiBaseUrl.replace(/\/$/, "");
    const actor = "ui-studio";
    const savePayload = await this.MRequestJson<MSaveRuleSetResponse>(`${baseUrl}/rulesets/${encodeURIComponent(workflowCode)}`, {
      method: "POST",
      body: JSON.stringify({
        ruleSet: detail.ruleSet,
        activateAfterSave: false,
        actor
      })
    });

    const savedVersion = Number(savePayload.savedVersion ?? 0);
    if (!Number.isFinite(savedVersion) || savedVersion <= 0) {
      throw new Error("Rule Studio publish did not return a saved version.");
    }

    const approvalWorkflowEnabled = Boolean(savePayload.approvalWorkflowEnabled);
    let activated = Boolean(savePayload.activated);
    let activeVersion = typeof savePayload.activeVersion === "number" ? savePayload.activeVersion : null;
    let status = typeof savePayload.status === "string" ? savePayload.status : undefined;
    let message = `Saved version ${savedVersion}.`;

    if (approvalWorkflowEnabled) {
      const submitResponse = await this.MRequestJson<{ status?: string }>(
        `${baseUrl}/rulesets/${encodeURIComponent(workflowCode)}/${savedVersion}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ actor })
        }
      );
      status = typeof submitResponse.status === "string" ? submitResponse.status : status;
      message = `Saved version ${savedVersion} and submitted for approval.`;
    } else if (!activated || activeVersion !== savedVersion) {
      const activateResponse = await this.MRequestJson<{ activeVersion?: number | null }>(
        `${baseUrl}/rulesets/${encodeURIComponent(workflowCode)}/${savedVersion}/activate`,
        {
          method: "POST",
          body: JSON.stringify({ actor })
        }
      );
      activated = true;
      activeVersion = typeof activateResponse.activeVersion === "number" ? activateResponse.activeVersion : savedVersion;
      status = "Active";
      message = `Saved version ${savedVersion} and activated it.`;
    } else {
      message = `Saved version ${savedVersion} and activated it.`;
    }

    return {
      ...detail,
      savedVersion,
      activeVersion,
      approvalWorkflowEnabled,
      activated,
      status,
      message
    };
  }

  private async MRequestJson<T>(url: string, init: RequestInit): Promise<T> {
    const headers = MBuildRuleComponentHeaders(init.headers, { tenantId: this.tenantId });
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const response = await fetch(url, {
      ...init,
      headers
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Rule Studio request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  private async MLoadWorkflowGraphAsync(): Promise<void> {
    const workflowCode = this.workflowCode.trim();
    const apiBaseUrl = this.apiBaseUrl.trim();
    if (!workflowCode || !apiBaseUrl || this.graphJson.trim()) {
      return;
    }

    const currentVersion = ++this.mWorkflowLoadVersion;
    const versionQuery = this.version != null ? `?version=${this.version}` : "";
    const exportUrl = `${apiBaseUrl.replace(/\/$/, "")}/rulesets/${encodeURIComponent(workflowCode)}/export${versionQuery}`;

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
