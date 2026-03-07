import { createSign, generateKeyPairSync, webcrypto, type KeyObject } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { MLicenseVerifier } from "../src/index.js";

describe("MLicenseVerifier", () => {
  beforeEach(() => {
    if (!globalThis.crypto?.subtle) {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: webcrypto
      });
    }

    MLicenseVerifier.MResetForTests();
  });

  it("accepts a valid RS256 activation proof", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const activationProof = MCreateJwt(
      {
        tier: "Licensed",
        tenantId: "tenant-a",
        features: ["rule-components", "decision-table"],
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      privateKey
    );

    const state = await MLicenseVerifier.initialize(activationProof, {
      publicKeyPem: publicKey.export({ type: "pkcs1", format: "pem" }).toString()
    });

    expect(state.isValid).toBe(true);
    expect(state.tier).toBe("Licensed");
    expect(state.tenantId).toBe("tenant-a");
    expect(MLicenseVerifier.hasFeature("decision-table")).toBe(true);
    expect(MLicenseVerifier.hasFeature("missing-feature")).toBe(false);
  });

  it("rejects proof when signature is invalid", async () => {
    const signer = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const verifier = generateKeyPairSync("rsa", { modulusLength: 2048 });

    const activationProof = MCreateJwt(
      {
        tier: "Licensed",
        features: ["rule-components"],
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      signer.privateKey
    );

    await expect(
      MLicenseVerifier.initialize(activationProof, {
        publicKeyPem: verifier.publicKey.export({ type: "pkcs1", format: "pem" }).toString()
      })
    ).rejects.toThrow("signature");

    expect(MLicenseVerifier.current.isValid).toBe(false);
    expect(MLicenseVerifier.current.reason).toBe("invalid_signature");
  });

  it("rejects expired proof", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const activationProof = MCreateJwt(
      {
        tier: "Enterprise",
        features: ["*"],
        exp: Math.floor(Date.now() / 1000) - 60
      },
      privateKey
    );

    await expect(
      MLicenseVerifier.initialize(activationProof, {
        publicKeyPem: publicKey.export({ type: "pkcs1", format: "pem" }).toString()
      })
    ).rejects.toThrow("expired");

    expect(MLicenseVerifier.current.isValid).toBe(false);
    expect(MLicenseVerifier.current.reason).toBe("expired");
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
