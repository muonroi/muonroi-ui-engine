import { LitElement, html, unsafeCSS, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  MUiEngineAction,
  MUiEngineComponent,
  MUiEngineContractInfo,
  MUiEngineManifest,
  MUiEngineNavigationNode,
  MUiEngineScreen
} from "@muonroi/ui-engine-core";
import tailwindStyles from "../../styles/tailwind.css?inline";

interface MUiSchemaHashPayload {
  version: string;
  schemaHash: string;
  openApiHash?: string | null;
  generatedAtUtc: string;
}

@customElement("mu-ui-engine-app")
export class MuUiEngineApp extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "title" })
  title = "UI Engine Runtime";

  @property({ type: String, attribute: "contract-endpoint" })
  contractEndpoint = "/api/v1/ui-engine/contract-info";

  @property({ type: String, attribute: "schema-hash-endpoint" })
  schemaHashEndpoint = "/api/v1/ui-engine/schema-hash";

  @property({ type: String, attribute: "manifest-endpoint" })
  manifestEndpoint = "/api/v1/ui-engine/current";

  @property({ type: String, attribute: "decision-table-api-base" })
  decisionTableApiBase = "/api/v1/decision-tables";

  @property({ type: String, attribute: "decision-table-editor-route" })
  decisionTableEditorRoute = "/decision-tables/editor";

  @property({ type: String, attribute: "decision-table-validate-endpoint" })
  decisionTableValidateEndpoint = "/api/v1/decision-tables/{id}/validate";

  @property({ type: String, attribute: "decision-table-export-endpoint" })
  decisionTableExportEndpoint = "/api/v1/decision-tables/{id}/export/{format}";

  @property({ type: String, attribute: "decision-table-history-endpoint" })
  decisionTableHistoryEndpoint = "/api/v1/decision-tables/{id}/versions";

  @property({ type: String, attribute: "decision-table-reorder-endpoint" })
  decisionTableReorderEndpoint = "/api/v1/decision-tables/{id}/rows/reorder";

  @property({ type: String, attribute: "feel-autocomplete-endpoint" })
  feelAutocompleteEndpoint = "/api/v1/feel/autocomplete";

  @property({ type: String, attribute: "feel-evaluate-endpoint" })
  feelEvaluateEndpoint = "/api/v1/feel/evaluate";

  @property({ type: String, attribute: "feel-examples-endpoint" })
  feelExamplesEndpoint = "/api/v1/feel/examples";

  @property({ type: String, attribute: "nrules-api-base" })
  nrulesApiBase = "/api/v1/rule-engine/nrules";

  @property({ type: String, attribute: "rule-test-endpoint" })
  ruleTestEndpoint = "/api/v1/rule-engine/test";

  @property({ type: String, attribute: "cep-api-base" })
  cepApiBase = "/api/v1/rule-engine/cep";

  @state()
  private mLoading = true;

  @state()
  private mError = "";

  @state()
  private mContract: MUiEngineContractInfo | null = null;

  @state()
  private mSchemaHash: MUiSchemaHashPayload | null = null;

  @state()
  private mManifest: MUiEngineManifest | null = null;

  @state()
  private mSelectedScreenKey = "";

  connectedCallback(): void {
    super.connectedCallback();
    void this.MLoadAsync();
  }

  private async MLoadAsync(): Promise<void> {
    this.mLoading = true;
    this.mError = "";

    try {
      const [contract, schemaHash, manifest] = await Promise.all([
        this.MFetchJson<MUiEngineContractInfo>(this.contractEndpoint),
        this.MFetchJson<MUiSchemaHashPayload>(this.schemaHashEndpoint),
        this.MFetchJson<MUiEngineManifest>(this.manifestEndpoint)
      ]);

      this.mContract = contract;
      this.mSchemaHash = schemaHash;
      this.mManifest = manifest;

      const firstVisible = this.MVisibleScreens()[0];
      this.mSelectedScreenKey = firstVisible?.screenKey ?? "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.mError = `Failed to load UI engine runtime data: ${message}`;
      this.mContract = null;
      this.mSchemaHash = null;
      this.mManifest = null;
      this.mSelectedScreenKey = "";
    } finally {
      this.mLoading = false;
    }
  }

  private async MFetchJson<TPayload>(url: string): Promise<TPayload> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return (await response.json()) as TPayload;
  }

  private MVisibleScreens(): MUiEngineScreen[] {
    return (this.mManifest?.screens ?? []).filter((screen) => screen.isVisible);
  }

  private MCurrentScreen(): MUiEngineScreen | null {
    if (!this.mSelectedScreenKey) {
      return null;
    }

    return this.MVisibleScreens().find((screen) => screen.screenKey === this.mSelectedScreenKey) ?? null;
  }

  private MActionsForScreen(screen: MUiEngineScreen): MUiEngineAction[] {
    const actions = this.mManifest?.actions ?? [];
    const actionMap = new Map(actions.map((action) => [action.actionKey, action]));
    return screen.actionKeys
      .map((actionKey) => actionMap.get(actionKey))
      .filter((action): action is MUiEngineAction => !!action && action.isVisible);
  }

  private MSelectScreen(screenKey: string): void {
    this.mSelectedScreenKey = screenKey;
  }

  private MSelectScreenByRoute(route: string): void {
    const normalized = route?.trim();
    if (!normalized || !this.mManifest) {
      return;
    }

    const screen = this.mManifest.screens.find((item) => item.route === normalized && item.isVisible);
    if (screen?.screenKey) {
      this.mSelectedScreenKey = screen.screenKey;
    }
  }

  private MOnNavigationClick(node: MUiEngineNavigationNode): void {
    if (!node.isEnabled) {
      return;
    }

    if (node.screenKey?.trim()) {
      this.MSelectScreen(node.screenKey);
      return;
    }

    this.MSelectScreenByRoute(node.route);
  }

  private MRenderNavigationNodes(nodes: MUiEngineNavigationNode[], level = 0): TemplateResult {
    const visibleNodes = nodes.filter((node) => node.isVisible).sort((left, right) => left.order - right.order);
    if (visibleNodes.length === 0) {
      return html``;
    }

    return html`
      <ul class=${`space-y-2 ${level > 0 ? "pl-4" : ""}`}>
        ${visibleNodes.map(
          (node) => html`
            <li>
              <button
                type="button"
                class=${[
                  "w-full rounded-md border px-3 py-2 text-left text-sm",
                  node.isEnabled
                    ? "border-[var(--color-mu-border)] bg-white hover:bg-[var(--color-mu-primary-soft)]"
                    : "border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed"
                ].join(" ")}
                ?disabled=${!node.isEnabled}
                @click=${() => this.MOnNavigationClick(node)}
              >
                <div class="font-medium">${node.title}</div>
                ${node.route ? html`<div class="text-xs text-zinc-500">${node.route}</div>` : html``}
              </button>
              ${this.MRenderNavigationNodes(node.children ?? [], level + 1)}
            </li>
          `
        )}
      </ul>
    `;
  }

  private MRenderComponent(component: MUiEngineComponent): TemplateResult {
    switch (component.componentType) {
      case "decision-table-list":
        return html`
          <mu-decision-table-list
            api-base=${this.decisionTableApiBase}
            editor-route=${this.decisionTableEditorRoute}
          ></mu-decision-table-list>
        `;
      case "decision-table-editor":
        return html`
          <mu-decision-table
            api-base=${this.decisionTableApiBase}
            validate-endpoint=${this.decisionTableValidateEndpoint}
            export-endpoint=${this.decisionTableExportEndpoint}
            feel-endpoint=${this.feelAutocompleteEndpoint}
            history-endpoint=${this.decisionTableHistoryEndpoint}
            reorder-endpoint=${this.decisionTableReorderEndpoint}
            table-id=${component.props?.tableId ?? ""}
          ></mu-decision-table>
        `;
      case "rule-flow-designer":
        return html`<mu-rule-flow-designer></mu-rule-flow-designer>`;
      case "nrules-editor":
        return html`<mu-nrules-editor api-base=${this.nrulesApiBase} test-endpoint=${this.ruleTestEndpoint}></mu-nrules-editor>`;
      case "cep-window-config":
        return html`<mu-cep-window-config api-base=${this.cepApiBase}></mu-cep-window-config>`;
      case "feel-playground":
        return html`
          <mu-feel-playground
            evaluate-endpoint=${this.feelEvaluateEndpoint}
            autocomplete-endpoint=${this.feelAutocompleteEndpoint}
            examples-endpoint=${this.feelExamplesEndpoint}
          ></mu-feel-playground>
        `;
      default:
        return html`
          <div class="rounded-md border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            Component <code>${component.componentType}</code> is not mapped in this UI package.
          </div>
        `;
    }
  }

  render() {
    if (this.mLoading) {
      return html`<section class="rounded-lg border border-dashed border-[var(--color-mu-border)] bg-white p-4">Loading runtime...</section>`;
    }

    if (this.mError) {
      return html`
        <section class="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
          <div class="font-semibold">UI Engine load failed</div>
          <div class="mt-1 text-sm">${this.mError}</div>
        </section>
      `;
    }

    const screen = this.MCurrentScreen();
    const actions = screen ? this.MActionsForScreen(screen) : [];
    const groups = this.mManifest?.navigationGroups ?? [];

    return html`
      <main class="space-y-4 rounded-xl border border-[var(--color-mu-border)] bg-[var(--color-mu-surface)] p-4 text-zinc-900">
        <header class="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--color-mu-border)] bg-white p-4">
          <div>
            <h2 class="text-xl font-semibold">${this.title}</h2>
            <p class="text-sm text-zinc-600">Manifest-driven runtime UI shell</p>
          </div>
          <button
            type="button"
            class="rounded-md border border-[var(--color-mu-border)] bg-white px-3 py-2 text-sm hover:bg-[var(--color-mu-primary-soft)]"
            @click=${this.MLoadAsync}
          >
            Refresh
          </button>
        </header>

        <section class="grid gap-3 md:grid-cols-3">
          <article class="rounded-lg border border-[var(--color-mu-border)] bg-white p-3 text-sm">
            <div class="font-semibold">Contract</div>
            <div class="mt-1">Runtime: <strong>${this.mContract?.runtimeSchemaVersion ?? "-"}</strong></div>
            <div>Supported: ${(this.mContract?.supportedSchemaVersions ?? []).join(", ") || "-"}</div>
          </article>
          <article class="rounded-lg border border-[var(--color-mu-border)] bg-white p-3 text-sm">
            <div class="font-semibold">Schema Hash</div>
            <div class="mt-1">Version: <strong>${this.mSchemaHash?.version ?? "-"}</strong></div>
            <div class="break-all font-mono text-xs">${this.mSchemaHash?.schemaHash ?? "-"}</div>
          </article>
          <article class="rounded-lg border border-[var(--color-mu-border)] bg-white p-3 text-sm">
            <div class="font-semibold">Manifest</div>
            <div class="mt-1">Schema: <strong>${this.mManifest?.schemaVersion ?? "-"}</strong></div>
            <div>Screens: ${(this.mManifest?.screens ?? []).length}</div>
          </article>
        </section>

        <section class="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside class="space-y-3 rounded-lg border border-[var(--color-mu-border)] bg-white p-3">
            <div class="text-sm font-semibold">Navigation</div>
            ${groups.map(
              (group) => html`
                <section class="space-y-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-zinc-500">${group.groupDisplayName}</div>
                  ${this.MRenderNavigationNodes(group.items ?? [])}
                </section>
              `
            )}
          </aside>

          <section class="space-y-3 rounded-lg border border-[var(--color-mu-border)] bg-white p-3">
            ${screen
              ? html`
                  <header class="space-y-1 border-b border-[var(--color-mu-border)] pb-3">
                    <h3 class="text-lg font-semibold">${screen.title}</h3>
                    <div class="text-xs text-zinc-600">
                      <span class="font-mono">${screen.screenKey}</span>
                      <span class="mx-2">|</span>
                      <span class="font-mono">${screen.route}</span>
                    </div>
                  </header>

                  ${actions.length > 0
                    ? html`
                        <div class="flex flex-wrap gap-2">
                          ${actions.map(
                            (action) => html`
                              <span
                                class=${[
                                  "rounded-full border px-3 py-1 text-xs",
                                  action.isEnabled
                                    ? "border-[var(--color-mu-border)] bg-[var(--color-mu-primary-soft)] text-[var(--color-mu-primary)]"
                                    : "border-zinc-200 bg-zinc-100 text-zinc-500"
                                ].join(" ")}
                              >
                                ${action.label}
                              </span>
                            `
                          )}
                        </div>
                      `
                    : html``}

                  ${screen.components
                    .slice()
                    .sort((left, right) => left.order - right.order)
                    .map(
                      (component) => html`
                        <article class="space-y-2 rounded-lg border border-[var(--color-mu-border)] bg-[var(--color-mu-surface)] p-3">
                          <div class="text-sm font-semibold">${component.componentType}</div>
                          ${this.MRenderComponent(component)}
                        </article>
                      `
                    )}
                `
              : html`<div class="rounded-lg border border-dashed border-[var(--color-mu-border)] bg-[var(--color-mu-surface)] p-4">No visible screen in manifest.</div>`}
          </section>
        </section>
      </main>
    `;
  }
}
