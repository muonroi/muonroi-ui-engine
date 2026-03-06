import "./components/decision-table/mu-decision-table.js";
import "./components/decision-table/mu-decision-table-list.js";
import "./components/decision-table/mu-dt-header-row.js";
import "./components/decision-table/mu-dt-data-row.js";
import "./components/decision-table/mu-dt-cell.js";
import "./components/decision-table/mu-dt-hit-policy-selector.js";
import "./components/decision-table/mu-dt-column-config.js";
import "./components/decision-table/mu-dt-version-diff.js";
import "./components/nrules/mu-nrules-editor.js";
import "./components/nrules/mu-nrules-condition.js";
import "./components/nrules/mu-nrules-action.js";
import "./components/cep/mu-cep-window-config.js";
import "./components/cep/mu-cep-event-stream.js";
import "./components/feel/mu-feel-playground.js";
import "./components/feel/mu-feel-autocomplete.js";
import "./components/rule-flow/mu-rule-flow-designer.js";
import "./components/rule-test/mu-rule-test-runner.js";
import "./components/shared/mu-upgrade-prompt.js";
import "./components/shared/mu-quota-indicator.js";
import "./components/shared/mu-schema-watcher.js";
import "./components/shared/mu-ui-engine-app.js";

export function MRegisterRuleComponents(): void {
  // Imports above call customElements.define() as a side effect.
}
