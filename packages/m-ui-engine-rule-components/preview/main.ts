/**
 * Standalone preview app for the Phase 4 Living Docs UI.
 *
 * Registers the local mu-living-docs + mu-traceability-matrix components and
 * renders them against the mock FCD API served by vite.preview.config.ts.
 * Pure dev tooling — never shipped in the library bundle.
 */
import "../src/registry.js";
import { WORKFLOW, VERSION } from "./mock-data.js";

const API = "/api/v1";

type TabId = "doc" | "matrix";

const app = document.getElementById("app")!;

function renderBanner(): string {
  return `
    <div id="refresh-banner" class="banner" hidden>
      <span>A newer version of this rule set is available.</span>
      <button id="apply-update" class="banner__btn">Apply update</button>
    </div>`;
}

function renderTabs(active: TabId): string {
  const tab = (id: TabId, label: string) =>
    `<button class="tab ${id === active ? "tab--active" : ""}" data-tab="${id}">${label}</button>`;
  return `<div class="tabs">${tab("doc", "Living Doc")}${tab("matrix", "Traceability Matrix")}</div>`;
}

function renderBody(active: TabId): string {
  if (active === "doc") {
    return `<mu-living-docs
      api-base-url="${API}"
      tenant-id="proj-eport-catlai"
      workflow="${WORKFLOW}"
      version="${VERSION}"
      read-only></mu-living-docs>`;
  }
  return `<mu-traceability-matrix
    api-base-url="${API}"
    tenant-id="proj-eport-catlai"
    workflow="${WORKFLOW}"
    version="${VERSION}"></mu-traceability-matrix>`;
}

let activeTab: TabId = "doc";

function render() {
  app.innerHTML = `
    <header class="topbar">
      <div class="topbar__title">
        <strong>Docs Intelligent</strong>
        <span class="topbar__sub">Living Documentation · ePort Cát Lái FCD · ${WORKFLOW} v${VERSION}</span>
      </div>
      <div class="topbar__actions">
        <button id="demo-refresh" class="ghost-btn">Simulate rule change</button>
        <button id="export-doc" class="primary-btn">Export Doc</button>
      </div>
    </header>
    ${renderBanner()}
    ${renderTabs(activeTab)}
    <main class="content">${renderBody(activeTab)}</main>`;

  app.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab as TabId;
      render();
    })
  );

  app.querySelector("#demo-refresh")?.addEventListener("click", () => {
    const banner = app.querySelector<HTMLElement>("#refresh-banner");
    if (banner) banner.hidden = false;
  });

  app.querySelector("#apply-update")?.addEventListener("click", () => {
    const banner = app.querySelector<HTMLElement>("#refresh-banner");
    if (banner) banner.hidden = true;
    // re-render current tab to simulate reload of the new version
    render();
  });

  app.querySelector("#export-doc")?.addEventListener("click", () => {
    alert("Export Doc — in the real dashboard this streams a provenance-stamped PDF from the control-plane API.");
  });
}

render();
