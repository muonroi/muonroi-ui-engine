import React, { useRef, useEffect } from "react";
import type { MRuleTraceEntry } from "../../models/trace-models.js";
import "./mu-rule-trace-viewer.js";

export interface MuRuleTraceViewerReactProps {
  traces?: MRuleTraceEntry[];
  apiBaseUrl?: string;
  tenantId?: string;
  correlationId?: string;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function MuRuleTraceViewerReact({
  traces,
  apiBaseUrl,
  tenantId,
  correlationId,
  readOnly,
  className,
  style,
}: MuRuleTraceViewerReactProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current as any;
    if (!el) return;
    if (traces) el.tracesJson = JSON.stringify(traces);
  }, [traces]);

  return React.createElement("mu-rule-trace-viewer", {
    ref,
    "api-base-url": apiBaseUrl ?? "",
    "tenant-id": tenantId ?? "",
    "correlation-id": correlationId ?? "",
    "read-only": readOnly ? "" : undefined,
    class: className,
    style,
  });
}
