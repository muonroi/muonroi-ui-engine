import { useCallback, useMemo, useReducer } from "react";
import type { MRuleFlowGraph } from "../models.js";
import { MCreateRuleFlowGraphSignature, MEnsureRuleFlowGraph } from "../components/rule-flow/rule-flow-runtime.js";

interface MHistoryState {
  past: MRuleFlowGraph[];
  present: MRuleFlowGraph;
  future: MRuleFlowGraph[];
}

type MHistoryAction =
  | { type: "commit"; graph: MRuleFlowGraph }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; graph: MRuleFlowGraph };

const M_MAX_HISTORY = 50;

function MHistoryReducer(state: MHistoryState, action: MHistoryAction): MHistoryState {
  switch (action.type) {
    case "commit": {
      const next = MEnsureRuleFlowGraph(action.graph);
      if (MCreateRuleFlowGraphSignature(next) === MCreateRuleFlowGraphSignature(state.present)) {
        return state;
      }

      const past = [...state.past, state.present].slice(-M_MAX_HISTORY);
      return {
        past,
        present: next,
        future: []
      };
    }
    case "undo": {
      if (state.past.length === 0) {
        return state;
      }

      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future]
      };
    }
    case "redo": {
      if (state.future.length === 0) {
        return state;
      }

      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present].slice(-M_MAX_HISTORY),
        present: next,
        future: rest
      };
    }
    case "reset":
      return {
        past: [],
        present: MEnsureRuleFlowGraph(action.graph),
        future: []
      };
    default:
      return state;
  }
}

export function useRuleFlowHistory(initialGraph: MRuleFlowGraph) {
  const normalizedInitial = useMemo(() => MEnsureRuleFlowGraph(initialGraph), [initialGraph]);
  const [state, dispatch] = useReducer(MHistoryReducer, {
    past: [],
    present: normalizedInitial,
    future: []
  });

  const commit = useCallback((graph: MRuleFlowGraph) => {
    dispatch({ type: "commit", graph });
  }, []);
  const undo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);
  const redo = useCallback(() => {
    dispatch({ type: "redo" });
  }, []);
  const reset = useCallback((graph: MRuleFlowGraph) => {
    dispatch({ type: "reset", graph });
  }, []);

  return useMemo(() => ({
    present: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit,
    undo,
    redo,
    reset
  }), [commit, redo, reset, state.future.length, state.past.length, state.present, undo]);
}
