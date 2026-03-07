export type MLicenseTier = "Free" | "Licensed" | "Enterprise";

export type MLicenseInvalidReason =
  | "not_initialized"
  | "invalid_format"
  | "invalid_signature"
  | "expired"
  | "not_yet_valid"
  | "verification_failed";

export interface MLicenseState {
  isValid: boolean;
  tier: MLicenseTier;
  tenantId?: string;
  features: string[];
  expiresAt?: Date;
  reason?: MLicenseInvalidReason;
  message?: string;
}

export interface MLicenseVerifierInitializeOptions {
  publicKeyPem?: string;
}

const MUONROI_PUBLIC_KEY_PEM = `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAmNLajHHSeDOOwkYRjLx6tcr0ajo0nQoPBtRZ1/ngclsO7i5vHONM
4zFbAIs4Zdt6mbz6/VD7BUzhk10UcX1j8k6eVrxKW7O7V8k3Hb0zHv58Hxc+5wvA
n6aTtvjGYRvuNxHhWdFqfjjwN0p6F50Q67XYf0o7VMFISv0OfdgAcDy/6NHcu/eM
l4fOAt5yUKik1fKrdPzjwn0030+nWXDJk9Oxx7sJZ+OAu9g3rc1KRh52XTPsWIp9
8PNbkieMB++7pp4I3cf7lPJPVRPFu1MV+Lsh1nLkDjmAJdvaZkXkBYwR10hKuRoC
YvfVXNczsy0yQg+pyS2SAE4ZTrI1Q7XbmQIDAQAB
-----END RSA PUBLIC KEY-----`;

const M_INITIAL_STATE: MLicenseState = {
  isValid: false,
  tier: "Free",
  features: [],
  reason: "not_initialized",
  message: "Activation proof has not been initialized."
};

export class MLicenseVerifier {
  private static mState: MLicenseState = { ...M_INITIAL_STATE };
  private static mCachedKeyPem: string | null = null;
  private static mCachedCryptoKey: Promise<CryptoKey> | null = null;

  static get current(): MLicenseState {
    return {
      ...this.mState,
      features: [...this.mState.features],
      expiresAt: this.mState.expiresAt ? new Date(this.mState.expiresAt.getTime()) : undefined
    };
  }

  static async initialize(
    activationProof: string,
    options?: MLicenseVerifierInitializeOptions
  ): Promise<MLicenseState> {
    const token = activationProof.trim();
    if (!token) {
      this.MSetInvalid("invalid_format", "Activation proof is empty.");
      throw new Error("Activation proof is empty.");
    }

    try {
      const keyPem = (options?.publicKeyPem ?? MUONROI_PUBLIC_KEY_PEM).trim();
      if (!keyPem) {
        throw new MLicenseVerificationError("verification_failed", "Public key PEM is empty.");
      }

      const key = await this.MGetOrImportPublicKey(keyPem);
      const payload = await this.MVerifyJwt(token, key);

      const features = MReadStringArrayClaim(payload, "features", "allowedFeatures", "capabilities");
      let tier = MParseTier(MReadClaim(payload, "tier", "license_tier", "licenseTier"));
      if (tier === "Free" && features.length > 0) {
        tier = "Licensed";
      }
      const tenantId = MReadStringClaim(payload, "tenantId", "tenant_id", "tid");
      const exp = MReadUnixTimestampClaim(payload, "exp");

      this.mState = {
        isValid: true,
        tier,
        tenantId: tenantId || undefined,
        features,
        expiresAt: exp ? new Date(exp * 1000) : undefined
      };

      return this.current;
    } catch (error) {
      if (error instanceof MLicenseVerificationError) {
        this.MSetInvalid(error.reason, error.message);
      } else {
        this.MSetInvalid("verification_failed", error instanceof Error ? error.message : "License verification failed.");
      }

      throw new Error(this.mState.message ?? "License verification failed.");
    }
  }

  static hasFeature(feature: string): boolean {
    const requested = feature.trim().toLowerCase();
    if (!requested || !this.mState.isValid || this.mState.tier === "Free") {
      return false;
    }

    const normalizedFeatures = this.mState.features
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);

    if (normalizedFeatures.includes("*")) {
      return true;
    }

    if (normalizedFeatures.length === 0) {
      return true;
    }

    return normalizedFeatures.includes(requested);
  }

  static hasAnyFeature(features: readonly string[]): boolean {
    for (const feature of features) {
      if (this.hasFeature(feature)) {
        return true;
      }
    }

    return false;
  }

  static reset(): void {
    this.mState = { ...M_INITIAL_STATE };
  }

  static MResetForTests(): void {
    this.reset();
    this.mCachedKeyPem = null;
    this.mCachedCryptoKey = null;
  }

  private static async MGetOrImportPublicKey(publicKeyPem: string): Promise<CryptoKey> {
    if (this.mCachedKeyPem === publicKeyPem && this.mCachedCryptoKey) {
      return this.mCachedCryptoKey;
    }

    this.mCachedKeyPem = publicKeyPem;
    this.mCachedCryptoKey = this.MImportPublicKey(publicKeyPem);
    return this.mCachedCryptoKey;
  }

  private static async MImportPublicKey(publicKeyPem: string): Promise<CryptoKey> {
    const cryptoApi = MGetCryptoApi();
    const normalized = publicKeyPem.trim();
    let spkiBytes: Uint8Array;

    if (normalized.includes("-----BEGIN PUBLIC KEY-----")) {
      spkiBytes = MPemToDer(normalized, "PUBLIC KEY");
    } else if (normalized.includes("-----BEGIN RSA PUBLIC KEY-----")) {
      const pkcs1Bytes = MPemToDer(normalized, "RSA PUBLIC KEY");
      spkiBytes = MWrapPkcs1PublicKeyAsSpki(pkcs1Bytes);
    } else {
      throw new MLicenseVerificationError("verification_failed", "Unsupported public key format.");
    }

    return await cryptoApi.subtle.importKey(
      "spki",
      MToArrayBuffer(spkiBytes),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["verify"]
    );
  }

  private static async MVerifyJwt(token: string, key: CryptoKey): Promise<Record<string, unknown>> {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new MLicenseVerificationError("invalid_format", "Activation proof is not a valid JWT.");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new MLicenseVerificationError("invalid_format", "Activation proof has an invalid JWT structure.");
    }

    const header = MParseJwtSection(encodedHeader);
    const algorithm = MReadStringClaim(header, "alg");
    if (algorithm.toUpperCase() !== "RS256") {
      throw new MLicenseVerificationError("invalid_format", `Unsupported JWT algorithm '${algorithm || "unknown"}'.`);
    }

    const payload = MParseJwtSection(encodedPayload);
    const nowInSeconds = Math.floor(Date.now() / 1000);

    const notBefore = MReadUnixTimestampClaim(payload, "nbf");
    if (notBefore !== null && notBefore > nowInSeconds) {
      throw new MLicenseVerificationError("not_yet_valid", "Activation proof is not active yet.");
    }

    const expiration = MReadUnixTimestampClaim(payload, "exp");
    if (expiration !== null && expiration <= nowInSeconds) {
      throw new MLicenseVerificationError("expired", "Activation proof has expired.");
    }

    const cryptoApi = MGetCryptoApi();
    const signature = MDecodeBase64Url(encodedSignature);
    const signedPayload = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

    const isValid = await cryptoApi.subtle.verify(
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      key,
      MToArrayBuffer(signature),
      MToArrayBuffer(signedPayload)
    );

    if (!isValid) {
      throw new MLicenseVerificationError("invalid_signature", "Activation proof signature is invalid.");
    }

    return payload;
  }

  private static MSetInvalid(reason: MLicenseInvalidReason, message: string): void {
    this.mState = {
      isValid: false,
      tier: "Free",
      features: [],
      reason,
      message
    };
  }
}

class MLicenseVerificationError extends Error {
  constructor(
    public readonly reason: MLicenseInvalidReason,
    message: string
  ) {
    super(message);
    this.name = "MLicenseVerificationError";
  }
}

function MGetCryptoApi(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new MLicenseVerificationError("verification_failed", "WebCrypto SubtleCrypto is unavailable.");
  }

  return globalThis.crypto;
}

function MParseJwtSection(section: string): Record<string, unknown> {
  try {
    const bytes = MDecodeBase64Url(section);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("JWT section payload must be an object.");
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new MLicenseVerificationError(
      "invalid_format",
      error instanceof Error ? error.message : "Unable to parse JWT payload."
    );
  }
}

function MReadClaim(payload: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in payload) {
      return payload[key];
    }

    const lower = key.toLowerCase();
    for (const [candidateKey, candidateValue] of Object.entries(payload)) {
      if (candidateKey.toLowerCase() === lower) {
        return candidateValue;
      }
    }
  }

  return undefined;
}

function MReadStringClaim(payload: Record<string, unknown>, ...keys: string[]): string {
  const value = MReadClaim(payload, ...keys);
  return typeof value === "string" ? value.trim() : "";
}

function MReadStringArrayClaim(payload: Record<string, unknown>, ...keys: string[]): string[] {
  const value = MReadClaim(payload, ...keys);
  if (Array.isArray(value)) {
    const values = value
      .filter((item): item is string => typeof item === "string")
      .flatMap((item) => item.split(","))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return [...new Set(values)];
  }

  if (typeof value === "string") {
    return [...new Set(value.split(",").map((item) => item.trim()).filter((item) => item.length > 0))];
  }

  return [];
}

function MReadUnixTimestampClaim(payload: Record<string, unknown>, ...keys: string[]): number | null {
  const value = MReadClaim(payload, ...keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }

  return null;
}

function MParseTier(value: unknown): MLicenseTier {
  if (typeof value !== "string") {
    return "Free";
  }

  switch (value.trim().toLowerCase()) {
    case "enterprise":
      return "Enterprise";
    case "licensed":
    case "license":
    case "professional":
    case "pro":
      return "Licensed";
    default:
      return "Free";
  }
}

function MDecodeBase64Url(value: string): Uint8Array {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  if (typeof atob !== "function") {
    throw new MLicenseVerificationError("verification_failed", "Base64 decoder is unavailable.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function MPemToDer(pem: string, pemType: "PUBLIC KEY" | "RSA PUBLIC KEY"): Uint8Array {
  const beginMarker = `-----BEGIN ${pemType}-----`;
  const endMarker = `-----END ${pemType}-----`;
  const body = pem
    .replace(beginMarker, "")
    .replace(endMarker, "")
    .replace(/\s+/g, "");

  return MDecodeBase64Url(body.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""));
}

function MWrapPkcs1PublicKeyAsSpki(pkcs1Bytes: Uint8Array): Uint8Array {
  const rsaAlgorithmIdentifier = Uint8Array.from([
    0x30, 0x0d,
    0x06, 0x09,
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00
  ]);

  const bitStringPayload = MConcat(Uint8Array.of(0x00), pkcs1Bytes);
  const bitString = MConcat(Uint8Array.of(0x03), MEncodeAsn1Length(bitStringPayload.length), bitStringPayload);
  const spkiBody = MConcat(rsaAlgorithmIdentifier, bitString);
  return MConcat(Uint8Array.of(0x30), MEncodeAsn1Length(spkiBody.length), spkiBody);
}

function MEncodeAsn1Length(length: number): Uint8Array {
  if (length < 0x80) {
    return Uint8Array.of(length);
  }

  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }

  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function MConcat(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function MToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}
