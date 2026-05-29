import { useCallback, useMemo, useReducer } from "react";

export interface UsePdfTemplateHistoryOptions {
  /** Maximum number of past states to retain. Default: 50. */
  capacity?: number;
}

interface MHistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

type MHistoryAction<T> =
  | { type: "set"; value: T }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

function makeHistoryReducer<T>(capacity: number) {
  return function historyReducer(
    state: MHistoryState<T>,
    action: MHistoryAction<T>
  ): MHistoryState<T> {
    switch (action.type) {
      case "set": {
        // Skip no-op commits (identity check by reference/value equality)
        if (Object.is(action.value, state.present)) {
          return state;
        }
        const past = [...state.past, state.present].slice(-capacity);
        return { past, present: action.value, future: [] };
      }
      case "undo": {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        return {
          past: state.past.slice(0, -1),
          present: previous,
          future: [state.present, ...state.future]
        };
      }
      case "redo": {
        if (state.future.length === 0) return state;
        const [next, ...rest] = state.future;
        return {
          past: [...state.past, state.present].slice(-capacity),
          present: next,
          future: rest
        };
      }
      case "reset":
        return { past: [], present: action.value, future: [] };
      default:
        return state;
    }
  };
}

export interface UsePdfTemplateHistoryResult<T> {
  /** Current (present) state value. */
  state: T;
  /** Commit a new value, clearing the redo stack. */
  set: (next: T) => void;
  /** Step backward one entry. No-op when canUndo is false. */
  undo: () => void;
  /** Step forward one entry. No-op when canRedo is false. */
  redo: () => void;
  /** True when there is at least one past entry to undo. */
  canUndo: boolean;
  /** True when there is at least one future entry to redo. */
  canRedo: boolean;
  /** Discard all history and set a new initial value. */
  reset: (value: T) => void;
}

/**
 * Generic undo/redo history hook for PDF template content.
 *
 * @param initial  The initial state value.
 * @param options  Optional configuration (capacity defaults to 50).
 *
 * @example
 * ```ts
 * const { state, set, undo, redo, canUndo, canRedo, reset } =
 *   usePdfTemplateHistory<string>(version.contentJson);
 * ```
 */
export function usePdfTemplateHistory<T>(
  initial: T,
  options?: UsePdfTemplateHistoryOptions
): UsePdfTemplateHistoryResult<T> {
  const capacity = options?.capacity ?? 50;

  const reducer = useMemo(() => makeHistoryReducer<T>(capacity), [capacity]);

  const [historyState, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: []
  });

  const set = useCallback((next: T) => {
    dispatch({ type: "set", value: next });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "redo" });
  }, []);

  const reset = useCallback((value: T) => {
    dispatch({ type: "reset", value });
  }, []);

  return useMemo(
    () => ({
      state: historyState.present,
      set,
      undo,
      redo,
      canUndo: historyState.past.length > 0,
      canRedo: historyState.future.length > 0,
      reset
    }),
    [historyState.future.length, historyState.past.length, historyState.present, redo, reset, set, undo]
  );
}
