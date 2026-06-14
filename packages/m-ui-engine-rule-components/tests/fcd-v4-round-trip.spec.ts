/**
 * STUDIO-04 — FCD_V4 ruleSetJson round-trip acceptance spec.
 *
 * Asserts that the canonical ui-engine MRuleFlowGraphConverter preserves:
 *   - workflowName, all 14 flowGraph nodes, the 2 top-level decisionTables
 *     (via {...source} spread in toRuleSet), FEEL expression bodies,
 *     outputFields paths, and the dependsOn array on gate-out-authorization.
 *
 * Canvas-boundary coercion (intentional, documented per 13-RESEARCH §Crux 1 (c)):
 *   The FCD_V4 fixture uses legacy node type "feel" and edge type "success".
 *   At the converter level (fromRuleSet/toRuleSet), these values are preserved
 *   because MNormalizeGraph spreads {...node} without calling MNormalizeNodeType.
 *   When the graph passes through MEnsureRuleFlowGraph (the editor/canvas boundary),
 *   MNormalizeNodeType coerces "feel"→"action" and MNormalizeEdgeType coerces
 *   the default edgeType from undefined→"always" (edges already get edgeType:"always"
 *   in fromRuleSet via edge.edgeType ?? "always").
 *   This coercion is the KNOWN, INTENTIONAL interoperability boundary (13-RESEARCH
 *   §Crux 1 (c)) and is asserted here as such — not as a bug, not as silent loss.
 *   Per project Honesty constraint: do NOT over-claim losslessness through the canvas.
 */

import { describe, expect, it } from "vitest";
import "../src/registry.js";
import { MRuleFlowGraphConverter } from "../src/utils/m-rule-flow-graph-converter.js";
import { MEnsureRuleFlowGraph } from "../src/components/rule-flow/MuRuleFlowEditor.js";
import fcdV4 from "./fixtures/fcd-v4-ruleset.json";

describe("FCD_V4 converter round-trip (STUDIO-04)", () => {
  it("preserves workflowName, all 14 nodes, and the 2 top-level decisionTables", () => {
    const g = MRuleFlowGraphConverter.fromRuleSet(fcdV4);
    const rt = MRuleFlowGraphConverter.toRuleSet(g, fcdV4) as any;

    // Core identity preservation
    expect(rt.workflowName).toBe("FCD_V4");

    // No node loss — all 14 FCD_V4 gate nodes survive the round-trip
    expect(rt.flowGraph.nodes).toHaveLength(14);

    // Top-level decisionTables survive via {...source} spread in toRuleSet
    expect(rt.decisionTables).toHaveLength(2);
  });

  it("preserves a representative FEEL expression body (vgm-check)", () => {
    const g = MRuleFlowGraphConverter.fromRuleSet(fcdV4);
    const rt = MRuleFlowGraphConverter.toRuleSet(g, fcdV4) as any;

    const vgmNode = (rt.flowGraph.nodes as any[]).find((n: any) => n.id === "vgm-check");
    expect(vgmNode).toBeDefined();
    // FEEL expression body survives verbatim through fromRuleSet → toRuleSet
    expect(vgmNode.data.expression.body).toBe("vgm.isVgm = true and vgm.wgt <= maxGross");
  });

  it("preserves outputFields path on a representative node (vgm-check)", () => {
    const g = MRuleFlowGraphConverter.fromRuleSet(fcdV4);
    const rt = MRuleFlowGraphConverter.toRuleSet(g, fcdV4) as any;

    const vgmNode = (rt.flowGraph.nodes as any[]).find((n: any) => n.id === "vgm-check");
    expect(vgmNode).toBeDefined();
    expect(vgmNode.data.outputFields[0].path).toBe("result.vgmAllowed");
  });

  it("preserves the 11-entry dependsOn array on gate-out-authorization", () => {
    const g = MRuleFlowGraphConverter.fromRuleSet(fcdV4);
    const rt = MRuleFlowGraphConverter.toRuleSet(g, fcdV4) as any;

    const gateNode = (rt.flowGraph.nodes as any[]).find(
      (n: any) => n.id === "gate-out-authorization"
    );
    expect(gateNode).toBeDefined();
    expect(gateNode.data.dependsOn).toHaveLength(11);
  });

  it("documents the canvas-boundary coercion: feel→action, success→always (intentional per 13-RESEARCH §Crux 1 (c))", () => {
    // Converter-level: fromRuleSet preserves legacy "feel" node type (MNormalizeGraph
    // spreads {...node} without MNormalizeNodeType). This is the converter contract.
    const g = MRuleFlowGraphConverter.fromRuleSet(fcdV4);
    const isoNodeInConverter = g.nodes.find((n) => n.id === "iso-booking-match");
    expect(isoNodeInConverter).toBeDefined();
    // At the converter boundary: type is preserved as the original legacy "feel" value
    expect(isoNodeInConverter!.type).toBe("feel");

    // Canvas boundary: MEnsureRuleFlowGraph (used by MuRuleFlowEditor on render/import)
    // applies MNormalizeNodeType which maps unknown types to "action".
    // "feel" is NOT in M_VALID_NODE_TYPES — so it coerces to "action".
    // This is the INTENTIONAL, DOCUMENTED interoperability boundary.
    // See: 13-RESEARCH §Crux 1 (c) — "feel→action / success→always is the known,
    // asserted normalization, not silent loss."
    const canvasG = MEnsureRuleFlowGraph(g);
    const isoNodeOnCanvas = canvasG.nodes.find((n) => n.id === "iso-booking-match");
    expect(isoNodeOnCanvas).toBeDefined();
    // Canvas coercion: "feel" → "action" (MNormalizeNodeType unknown → "action")
    expect(isoNodeOnCanvas!.type).toBe("action");

    // Edge coercion: edges in the fixture use "type":"success" (no edgeType field).
    // fromRuleSet sets edgeType:"always" via (edge.edgeType ?? "always").
    // MEnsureRuleFlowGraph further confirms via MNormalizeEdgeType("always") → "always".
    const firstEdge = canvasG.edges.find((e) => e.source === "iso-booking-match");
    expect(firstEdge).toBeDefined();
    expect(firstEdge!.edgeType).toBe("always");
  });
});
