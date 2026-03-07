import { createSign, generateKeyPairSync, webcrypto, type KeyObject } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MLicenseVerifier } from "@muonroi/ui-engine-core";
import { MCanRenderCommercialFeature } from "../src/license/m-commercial-guard.js";
import "../src/components/decision-table/mu-decision-table.js";

describe("commercial component license guard", () => {
  beforeEach(() => {
    if (!globalThis.crypto?.subtle) {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: webcrypto
      });
    }

    MLicenseVerifier.MResetForTests();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders license gate for decision table when activation proof is missing", async () => {
    const element = document.createElement("mu-decision-table") as HTMLElement & { updateComplete?: Promise<void> };
    document.body.appendChild(element);
    if (element.updateComplete) {
      await element.updateComplete;
    }

    expect(MCanRenderCommercialFeature("decision-table")).toBe(false);
    expect(element.shadowRoot?.textContent).toContain("License required");
  });

  it("unlocks commercial features after verifier initialization", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const proof = MCreateJwt(
      {
        tier: "Licensed",
        features: ["rule-components", "decision-table"],
        exp: Math.floor(Date.now() / 1000) + 1800
      },
      privateKey
    );

    await MLicenseVerifier.initialize(proof, {
      publicKeyPem: publicKey.export({ type: "pkcs1", format: "pem" }).toString()
    });

    expect(MCanRenderCommercialFeature("decision-table")).toBe(true);
  });
});

function MCreateJwt(payload: Record<string, unknown>, privateKey: KeyObject): string {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const encodedHeader = MBase64UrlEncode(JSON.stringify(header));
  const encodedPayload = MBase64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);

  return `${signingInput}.${MBase64UrlEncode(signature)}`;
}

function MBase64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
