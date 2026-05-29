/**
 * Minimal @microsoft/signalr stub for vitest.
 * Prevents real WebSocket / HTTP connections in test environments.
 */
import { vi } from "vitest";

export enum LogLevel {
  Trace = 0,
  Debug = 1,
  Information = 2,
  Warning = 3,
  Error = 4,
  Critical = 5,
  None = 6
}

export enum HubConnectionState {
  Disconnected = "Disconnected",
  Connecting = "Connecting",
  Connected = "Connected",
  Disconnecting = "Disconnecting",
  Reconnecting = "Reconnecting"
}

// Shared mock connection instance — tests can inspect/configure it via vitest spies.
export const mockHubConnection = {
  state: HubConnectionState.Disconnected as string,
  start: vi.fn(async () => {
    mockHubConnection.state = HubConnectionState.Connected;
  }),
  stop: vi.fn(async () => {
    mockHubConnection.state = HubConnectionState.Disconnected;
  }),
  on: vi.fn((_method: string, _callback: (...args: unknown[]) => void) => undefined),
  off: vi.fn((_method: string) => undefined),
  invoke: vi.fn(async () => undefined)
};

/**
 * Simulate a server push event on a registered method.
 * Used in tests: `triggerHubEvent("TemplateChanged", payload)`.
 */
export function triggerHubEvent(method: string, ...args: unknown[]): void {
  const onCalls = (mockHubConnection.on as ReturnType<typeof vi.fn>).mock.calls as Array<[string, (...a: unknown[]) => void]>;
  for (const [m, cb] of onCalls) {
    if (m === method) {
      cb(...args);
    }
  }
}

/** Reset all mocks between tests. */
export function resetSignalRMocks(): void {
  mockHubConnection.state = HubConnectionState.Disconnected;
  vi.clearAllMocks();
}

export class HubConnectionBuilder {
  withUrl(_url: string, _options?: unknown): this {
    return this;
  }
  withAutomaticReconnect(_opts?: unknown): this {
    return this;
  }
  configureLogging(_level: LogLevel): this {
    return this;
  }
  build() {
    return mockHubConnection;
  }
}
