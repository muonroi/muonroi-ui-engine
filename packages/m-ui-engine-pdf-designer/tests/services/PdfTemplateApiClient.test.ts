import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PdfTemplateApiClient,
  PdfTemplateApiError
} from "../../src/services/PdfTemplateApiClient.js";
import { MResetPdfDesignerRuntimeForTests } from "../../src/runtime/request-context.js";

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fetch stub that records every call and resolves with `responseBody`.
 * Unlike `vi.mocked(fn).mockResolvedValue(...)`, this does NOT replace the spy's
 * call-recording implementation — it uses a single spy that both records and responds.
 */
function makeCapturingFetch(
  responseBody: unknown,
  status = 200
): {
  fetchImpl: typeof fetch;
  calls: Array<{ url: string; init: RequestInit }>;
} {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return Promise.resolve(
      new Response(JSON.stringify(responseBody), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    );
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function makeErrorFetch(errorBody: unknown, status: number): typeof fetch {
  return vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(
      new Response(JSON.stringify(errorBody), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    )
  ) as unknown as typeof fetch;
}

const BASE_URL = "http://localhost:5100/api/v1/control-plane";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PdfTemplateApiClient", () => {
  beforeEach(() => {
    MResetPdfDesignerRuntimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── GET list ───────────────────────────────────────────────────────────────

  describe("listTemplates()", () => {
    it("sends GET to /pdf-templates and returns parsed array", async () => {
      const templates = [
        {
          id: "t1",
          templateId: "invoice",
          name: "Invoice",
          status: "Draft",
          isActive: false,
          createdBy: "alice",
          createdAt: "",
          updatedAt: "",
          tenantId: "ten1"
        }
      ];
      const { fetchImpl, calls } = makeCapturingFetch(templates);

      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });
      const result = await client.listTemplates();

      expect(calls[0]?.url).toBe(`${BASE_URL}/pdf-templates`);
      // GET has no explicit method — init.method is undefined (browser default GET)
      expect((calls[0]?.init as RequestInit).method).toBeUndefined();
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("t1");
    });

    it("injects x-tenant-id and Authorization headers on every request", async () => {
      const { fetchImpl, calls } = makeCapturingFetch([]);

      const client = new PdfTemplateApiClient({
        baseUrl: BASE_URL,
        fetchImpl,
        tenantId: "tenant-99",
        getAccessToken: () => "tok-abc"
      });

      await client.listTemplates();

      const headers = new Headers((calls[0]?.init as RequestInit).headers as HeadersInit);
      expect(headers.get("x-tenant-id")).toBe("tenant-99");
      expect(headers.get("Authorization")).toBe("Bearer tok-abc");
      expect(headers.has("X-Correlation-Id")).toBe(true);
    });
  });

  // ── POST create ────────────────────────────────────────────────────────────

  describe("createTemplate()", () => {
    it("sends POST to /pdf-templates with correct JSON body", async () => {
      const created = {
        id: "new-1",
        templateId: "report",
        name: "Report",
        status: "Draft",
        isActive: false,
        tenantId: "t1",
        createdBy: "alice",
        createdAt: "",
        updatedAt: ""
      };
      const { fetchImpl, calls } = makeCapturingFetch(created);

      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });
      const payload = {
        tenantId: "t1",
        templateId: "report",
        name: "Report",
        contentJson: "<html><body>Hello</body></html>",
        contentType: "text/html",
        createdBy: "alice"
      };

      const result = await client.createTemplate(payload);

      expect(calls[0]?.url).toBe(`${BASE_URL}/pdf-templates`);
      expect((calls[0]?.init as RequestInit).method).toBe("POST");
      const body = JSON.parse((calls[0]?.init as RequestInit).body as string);
      expect(body.templateId).toBe("report");
      expect(body.contentType).toBe("text/html");
      expect(result.id).toBe("new-1");
    });

    it("sets Content-Type: application/json on POST body", async () => {
      const { fetchImpl, calls } = makeCapturingFetch({});

      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });
      await client.createTemplate({
        tenantId: "t1",
        templateId: "x",
        name: "X",
        contentJson: "<p></p>",
        contentType: "text/html",
        createdBy: "u1"
      });

      const headers = new Headers((calls[0]?.init as RequestInit).headers as HeadersInit);
      expect(headers.get("Content-Type")).toBe("application/json");
    });
  });

  // ── PUT update ────────────────────────────────────────────────────────────

  describe("updateDraftVersion()", () => {
    it("sends PUT to /pdf-templates/{id}/versions/{version} with correct URL", async () => {
      const updated = {
        id: "ver-2",
        version: 2,
        status: "Draft",
        tenantId: "t1",
        templateId: "inv",
        contentJson: "",
        contentType: "text/html",
        createdBy: "u1",
        createdAt: "",
        updatedAt: ""
      };
      const { fetchImpl, calls } = makeCapturingFetch(updated);

      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });
      await client.updateDraftVersion("guid-123", 2, {
        contentJson: "<p>updated</p>",
        contentType: "text/html",
        updatedBy: "bob"
      });

      expect(calls[0]?.url).toBe(`${BASE_URL}/pdf-templates/guid-123/versions/2`);
      expect((calls[0]?.init as RequestInit).method).toBe("PUT");
      const body = JSON.parse((calls[0]?.init as RequestInit).body as string);
      expect(body.updatedBy).toBe("bob");
    });
  });

  // ── POST :reject with reason ───────────────────────────────────────────────

  describe("reject()", () => {
    it("sends POST to :reject with reason in body", async () => {
      const rejected = {
        id: "ver-1",
        version: 1,
        status: "Rejected",
        tenantId: "t1",
        templateId: "inv",
        contentJson: "",
        contentType: "text/html",
        createdBy: "u1",
        createdAt: "",
        updatedAt: ""
      };
      const { fetchImpl, calls } = makeCapturingFetch(rejected);

      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });
      await client.reject("guid-abc", 1, {
        reason: "Layout violates PROFILE-V1",
        actor: "carol"
      });

      expect(calls[0]?.url).toBe(`${BASE_URL}/pdf-templates/guid-abc/versions/1:reject`);
      expect((calls[0]?.init as RequestInit).method).toBe("POST");
      const body = JSON.parse((calls[0]?.init as RequestInit).body as string);
      expect(body.reason).toBe("Layout violates PROFILE-V1");
      expect(body.actor).toBe("carol");
    });

    it("throws PdfTemplateApiError on non-2xx response", async () => {
      const fetchImpl = makeErrorFetch({ error: "Forbidden" }, 403);

      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });
      await expect(
        client.reject("guid-x", 1, { reason: "bad" })
      ).rejects.toThrow(PdfTemplateApiError);
    });
  });

  // ── Lifecycle endpoints ────────────────────────────────────────────────────

  describe("submitForApproval()", () => {
    it("sends POST to :submit-for-approval", async () => {
      const submitted = {
        id: "v1",
        version: 1,
        status: "PendingApproval",
        tenantId: "t1",
        templateId: "x",
        contentJson: "",
        contentType: "text/html",
        createdBy: "u1",
        createdAt: "",
        updatedAt: ""
      };
      const { fetchImpl, calls } = makeCapturingFetch(submitted);

      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });
      await client.submitForApproval("tpl-1", 1, { actor: "alice" });

      expect(calls[0]?.url).toBe(
        `${BASE_URL}/pdf-templates/tpl-1/versions/1:submit-for-approval`
      );
      expect((calls[0]?.init as RequestInit).method).toBe("POST");
    });
  });

  describe("listVersions()", () => {
    it("sends GET to /pdf-templates/{id}/versions and decodes array", async () => {
      const versions = [
        {
          id: "v1",
          version: 1,
          status: "Draft",
          tenantId: "t1",
          templateId: "x",
          contentJson: "",
          contentType: "text/html",
          createdBy: "u1",
          createdAt: "",
          updatedAt: ""
        }
      ];
      const { fetchImpl, calls } = makeCapturingFetch(versions);

      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });
      const result = await client.listVersions("tpl-guid");

      expect(calls[0]?.url).toBe(`${BASE_URL}/pdf-templates/tpl-guid/versions`);
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe("Draft");
    });
  });

  describe("error handling", () => {
    it("extracts error message from body.error field on non-2xx", async () => {
      const fetchImpl = makeErrorFetch({ error: "Template not found" }, 404);
      const client = new PdfTemplateApiClient({ baseUrl: BASE_URL, fetchImpl });

      try {
        await client.getTemplate("no-such-id");
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(PdfTemplateApiError);
        expect((err as PdfTemplateApiError).message).toBe("Template not found");
        expect((err as PdfTemplateApiError).status).toBe(404);
      }
    });

    it("strips trailing slash from baseUrl", async () => {
      const { fetchImpl, calls } = makeCapturingFetch([]);

      const client = new PdfTemplateApiClient({
        baseUrl: BASE_URL + "///",
        fetchImpl
      });
      await client.listTemplates();
      expect(calls[0]?.url).toBe(`${BASE_URL}/pdf-templates`);
    });
  });
});
