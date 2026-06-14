import { afterEach, describe, expect, it, vi } from "vitest";
import { LivingDocsApiClient } from "../src/services/living-docs-api";

function stubFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(
    async () =>
      new Response(JSON.stringify({ ok: true, nodes: [], rows: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
  );
}

describe("LivingDocsApiClient auth header (Living Docs 401 fix)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("attaches Authorization: Bearer when an auth token is supplied", async () => {
    const fetchSpy = stubFetch();
    vi.stubGlobal("fetch", fetchSpy);

    const client = new LivingDocsApiClient("/api/v1", "tok-123");
    await client.getLivingDoc("FCD_V4", "active");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/living-docs/FCD_V4/active",
      expect.objectContaining({ headers: { Authorization: "Bearer tok-123" } })
    );
  });

  it("sends no Authorization header when no token is supplied (anonymous, fail-closed)", async () => {
    const fetchSpy = stubFetch();
    vi.stubGlobal("fetch", fetchSpy);

    const client = new LivingDocsApiClient("/api/v1");
    await client.getTraceabilityMatrix("FCD_V4", 4);

    const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.headers).toBeUndefined();
  });
});
