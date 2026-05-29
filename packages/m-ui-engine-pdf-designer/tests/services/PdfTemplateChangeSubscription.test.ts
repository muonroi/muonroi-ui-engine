import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockHubConnection,
  resetSignalRMocks,
  triggerHubEvent,
  HubConnectionState
} from "../stubs/signalr.js";
import { PdfTemplateChangeSubscription } from "../../src/services/PdfTemplateChangeSubscription.js";
import type { PdfTemplateChange } from "../../src/models/PdfTemplateChange.js";

const HUB_URL = "http://localhost:5100/hubs/ruleset-changes";

describe("PdfTemplateChangeSubscription", () => {
  beforeEach(() => {
    resetSignalRMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Connect / Disconnect ───────────────────────────────────────────────────

  describe("connect() / disconnect()", () => {
    it("starts the hub connection and transitions to Connected state", async () => {
      const sub = new PdfTemplateChangeSubscription(HUB_URL);
      await sub.connect();

      expect(mockHubConnection.start).toHaveBeenCalledOnce();
      expect(mockHubConnection.state).toBe(HubConnectionState.Connected);
    });

    it("is re-entrant — second connect() call while connected is a no-op", async () => {
      const sub = new PdfTemplateChangeSubscription(HUB_URL);
      await sub.connect();
      await sub.connect(); // second call

      expect(mockHubConnection.start).toHaveBeenCalledOnce();
    });

    it("stops the connection on disconnect()", async () => {
      const sub = new PdfTemplateChangeSubscription(HUB_URL);
      await sub.connect();
      await sub.disconnect();

      expect(mockHubConnection.stop).toHaveBeenCalledOnce();
      expect(mockHubConnection.state).toBe(HubConnectionState.Disconnected);
    });
  });

  // ── onTemplateChanged subscription ────────────────────────────────────────

  describe("onTemplateChanged()", () => {
    it("invokes registered callback when TemplateChanged event fires", async () => {
      const sub = new PdfTemplateChangeSubscription(HUB_URL);
      await sub.connect();

      const received: PdfTemplateChange[] = [];
      sub.onTemplateChanged((change) => received.push(change));

      const payload: PdfTemplateChange = {
        templateId: "invoice-v1",
        newVersion: "2",
        changeKind: "Updated"
      };
      triggerHubEvent("TemplateChanged", payload);

      expect(received).toHaveLength(1);
      expect(received[0]?.templateId).toBe("invoice-v1");
      expect(received[0]?.changeKind).toBe("Updated");
    });

    it("unsubscribe function removes the handler from future events", async () => {
      const sub = new PdfTemplateChangeSubscription(HUB_URL);
      await sub.connect();

      const received: PdfTemplateChange[] = [];
      const unsub = sub.onTemplateChanged((change) => received.push(change));

      // First event — handler active
      triggerHubEvent("TemplateChanged", { templateId: "t1", newVersion: "1", changeKind: "Updated" });
      expect(received).toHaveLength(1);

      // Unsubscribe
      unsub();

      // Second event — handler removed
      triggerHubEvent("TemplateChanged", { templateId: "t1", newVersion: "2", changeKind: "Updated" });
      expect(received).toHaveLength(1); // still 1 — no new push
    });

    it("registers the TemplateChanged listener on the hub connection", async () => {
      const sub = new PdfTemplateChangeSubscription(HUB_URL);
      await sub.connect();

      const onCalls = (mockHubConnection.on as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown]>;
      const registeredMethods = onCalls.map(([method]) => method);
      expect(registeredMethods).toContain("TemplateChanged");
    });

    it("dispatches Deleted events with null newVersion to callbacks", async () => {
      const sub = new PdfTemplateChangeSubscription(HUB_URL);
      await sub.connect();

      const received: PdfTemplateChange[] = [];
      sub.onTemplateChanged((c) => received.push(c));

      triggerHubEvent("TemplateChanged", {
        templateId: "old-template",
        newVersion: null,
        changeKind: "Deleted"
      });

      expect(received[0]?.newVersion).toBeNull();
      expect(received[0]?.changeKind).toBe("Deleted");
    });
  });
});
