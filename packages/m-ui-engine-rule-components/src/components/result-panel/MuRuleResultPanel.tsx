import React, { useRef, useEffect } from "react";
import type { MValidationSummary } from "../../models/result-models.js";
import "./mu-rule-result-panel.js";

export interface MuRuleResultPanelReactProps {
  result?: MValidationSummary | null;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function MuRuleResultPanelReact({
  result,
  loading,
  className,
  style,
}: MuRuleResultPanelReactProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current as any;
    if (!el) return;
    if (result) el.resultJson = JSON.stringify(result);
  }, [result]);

  return React.createElement("mu-rule-result-panel", {
    ref,
    loading: loading ? "" : undefined,
    class: className,
    style,
  });
}
