import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePdfTemplateHistory } from "../../src/hooks/usePdfTemplateHistory.js";

describe("usePdfTemplateHistory", () => {
  // ── Basic undo / redo ──────────────────────────────────────────────────────

  it("initialises with empty past/future and correct present", () => {
    const { result } = renderHook(() => usePdfTemplateHistory("initial"));

    expect(result.current.state).toBe("initial");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("set() commits a new value and enables undo", () => {
    const { result } = renderHook(() => usePdfTemplateHistory("v1"));

    act(() => result.current.set("v2"));

    expect(result.current.state).toBe("v2");
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("undo() steps back one entry and enables redo", () => {
    const { result } = renderHook(() => usePdfTemplateHistory("v1"));

    act(() => result.current.set("v2"));
    act(() => result.current.undo());

    expect(result.current.state).toBe("v1");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("redo() reapplies the undone value", () => {
    const { result } = renderHook(() => usePdfTemplateHistory("v1"));

    act(() => result.current.set("v2"));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.state).toBe("v2");
    expect(result.current.canRedo).toBe(false);
  });

  // ── Identity deduplication ─────────────────────────────────────────────────

  it("skips no-op set() — same reference does not push to history", () => {
    const { result } = renderHook(() => usePdfTemplateHistory("v1"));
    const before = result.current.canUndo;

    act(() => result.current.set("v1")); // same value

    expect(result.current.canUndo).toBe(before); // unchanged
    expect(result.current.state).toBe("v1");
  });

  // ── Capacity eviction ──────────────────────────────────────────────────────

  it("evicts oldest entries when capacity is exceeded", () => {
    const capacity = 3;
    const { result } = renderHook(() =>
      usePdfTemplateHistory("v0", { capacity })
    );

    // Commit capacity + 1 = 4 changes; past should hold exactly 3
    act(() => result.current.set("v1"));
    act(() => result.current.set("v2"));
    act(() => result.current.set("v3"));
    act(() => result.current.set("v4")); // pushes v0 off the stack

    // Undo 3 times — should land at v1 (v0 evicted)
    act(() => result.current.undo());
    act(() => result.current.undo());
    act(() => result.current.undo());

    expect(result.current.state).toBe("v1");
    expect(result.current.canUndo).toBe(false); // v0 was evicted
  });

  // ── Reset ─────────────────────────────────────────────────────────────────

  it("reset() clears all history and sets a new initial value", () => {
    const { result } = renderHook(() => usePdfTemplateHistory("v1"));

    act(() => result.current.set("v2"));
    act(() => result.current.set("v3"));
    act(() => result.current.reset("fresh"));

    expect(result.current.state).toBe("fresh");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  // ── Multi-step undo/redo ───────────────────────────────────────────────────

  it("supports multiple undo/redo cycles in sequence", () => {
    const { result } = renderHook(() => usePdfTemplateHistory(0));

    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.set(3));

    act(() => result.current.undo());
    expect(result.current.state).toBe(2);

    act(() => result.current.undo());
    expect(result.current.state).toBe(1);

    act(() => result.current.redo());
    expect(result.current.state).toBe(2);

    // New commit clears redo stack
    act(() => result.current.set(99));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.state).toBe(99);
  });

  // ── Typed generics ────────────────────────────────────────────────────────

  it("works with object state (reference semantics for identity check)", () => {
    const obj1 = { html: "<p>hello</p>" };
    const obj2 = { html: "<p>world</p>" };

    const { result } = renderHook(() => usePdfTemplateHistory(obj1));

    act(() => result.current.set(obj2));
    expect(result.current.state).toBe(obj2);
    expect(result.current.canUndo).toBe(true);

    // Setting the same reference is a no-op
    act(() => result.current.set(obj2));
    expect(result.current.canUndo).toBe(true); // only one past entry
  });
});
