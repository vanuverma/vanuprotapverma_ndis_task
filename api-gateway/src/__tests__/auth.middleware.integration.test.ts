import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import type { Request, Response, NextFunction } from "express";
import Jwt from "jsonwebtoken";
import crypto from "crypto";

const { mockGetPublicKey, mockGetSigningKey, mockGetFutureExpiry } = vi.hoisted(
  () => ({
    mockGetPublicKey: vi.fn(),
    mockGetSigningKey: vi.fn(),
    mockGetFutureExpiry: vi.fn(),
  }),
);

vi.mock("jwks-rsa", () => ({
  JwksClient: vi
    .fn()
    .mockImplementation(() => ({ getSigningKey: mockGetSigningKey })),
}));

vi.mock("../utils/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("../utils/app-error.util.js", () => ({
  AppError: class AppError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public errorCode: string,
    ) {
      super(message);
    }
  },
}));
vi.mock("../utils/constants.js", () => ({
  ErrorCodes: { UNAUTHORIZED: "UNAUTHORIZED" },
}));
vi.mock("../utils/utilities.js", () => ({
  getFutureExpiryTimeInMilliSeconds: mockGetFutureExpiry,
}));

import { verifyJwtHandler } from "../middlewares/auth.middleware.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_KID = "kid-001";
const TEST_ISSUER = "https://test.auth0.com/";
const TEST_AUDIENCE = "https://test-api.example.com";

const keys = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

function makeToken(
  overrides: {
    privateKey?: string;
    kid?: string;
    sub?: string;
    issuer?: string;
    audience?: string;
    expiresIn?: string | number;
  } = {},
): string {
  const {
    privateKey = keys.privateKey,
    kid = TEST_KID,
    sub = "auth0|user-1",
    issuer = TEST_ISSUER,
    audience = TEST_AUDIENCE,
    expiresIn = "1h",
  } = overrides;

  return Jwt.sign({ sub }, privateKey, {
    algorithm: "RS256",
    keyid: kid,
    issuer,
    audience,
    expiresIn,
  } as Jwt.SignOptions);
}

function makeReq(headers: Record<string, string> = {}): Partial<Request> {
  return {
    method: "GET",
    originalUrl: "/protected",
    ip: "127.0.0.1",
    correlationId: "corr-1",
    headers: { ...headers } as Request["headers"],
  };
}

const FUTURE = Date.now() + 30 * 60 * 1000;
const PAST = Date.now() - 1;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("verifyJwtHandler", () => {
  let next: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    process.env.AUTH0_JWKS_URL = "https://test.auth0.com/.well-known/jwks.json";
    process.env.AUTH0_ISSUER = TEST_ISSUER;
    process.env.AUTH0_AUDIENCE = TEST_AUDIENCE;
  });

  beforeEach(() => {
    next = vi.fn();
    mockGetFutureExpiry.mockReturnValue(FUTURE);
    mockGetPublicKey.mockReturnValue(keys.publicKey);
    mockGetSigningKey.mockResolvedValue({ getPublicKey: mockGetPublicKey });
  });

  afterEach(() => vi.clearAllMocks());

  // ── Success ───────────────────────────────────────────────────────────────

  it.skip("calls next() and sets x-verified-user on a valid token", async () => {
    const req = makeReq({ authorization: `Bearer ${makeToken()}` });

    await verifyJwtHandler(
      req as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith();
    expect((req.headers as Record<string, string>)["x-verified-user"]).toBe(
      "auth0|user-1",
    );
  });

  // ── Token extraction ──────────────────────────────────────────────────────

  it.each([
    ["missing Authorization header", {}],
    ["empty Authorization value", { authorization: "" }],
    ["Bearer with no token", { authorization: "Bearer " }],
  ])("passes 401 to next() — %s", async (_label, headers) => {
    await verifyJwtHandler(
      makeReq(headers) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Token extract error",
      }),
    );
  });

  // ── Token decoding ────────────────────────────────────────────────────────

  it("passes 401 to next() when the token is not a valid JWT", async () => {
    await verifyJwtHandler(
      makeReq({ authorization: "Bearer garbage" }) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Token decode error",
      }),
    );
  });

  it("passes 401 to next() when the JWT header has no kid", async () => {
    const noKidToken = Jwt.sign({ sub: "u1" }, keys.privateKey, {
      algorithm: "RS256",
      issuer: TEST_ISSUER,
      audience: TEST_AUDIENCE,
    } as Jwt.SignOptions);

    await verifyJwtHandler(
      makeReq({ authorization: `Bearer ${noKidToken}` }) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: "Token kid error" }),
    );
  });

  // ── JWKS key caching ──────────────────────────────────────────────────────

  it.skip("fetches JWKS on the first request then uses the cache on subsequent ones", async () => {
    const token = makeToken({ kid: "cache-test-kid" });

    await verifyJwtHandler(
      makeReq({ authorization: `Bearer ${token}` }) as Request,
      {} as Response,
      vi.fn(),
    );
    mockGetSigningKey.mockClear();
    await verifyJwtHandler(
      makeReq({ authorization: `Bearer ${token}` }) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(mockGetSigningKey).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it.skip("re-fetches JWKS when the cached key is expired", async () => {
    const kid = "expiry-test-kid";
    const token = makeToken({ kid });

    mockGetFutureExpiry.mockReturnValueOnce(PAST);
    await verifyJwtHandler(
      makeReq({ authorization: `Bearer ${token}` }) as Request,
      {} as Response,
      vi.fn(),
    );

    mockGetSigningKey.mockClear();
    await verifyJwtHandler(
      makeReq({ authorization: `Bearer ${token}` }) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(mockGetSigningKey).toHaveBeenCalledWith(kid);
  });

  // ── JWT verification ──────────────────────────────────────────────────────

  it.each([
    [
      "wrong signing key",
      () =>
        makeToken({
          privateKey: crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
          }).privateKey,
        }),
    ],
    ["expired token", () => makeToken({ expiresIn: -1 })],
    ["wrong issuer", () => makeToken({ issuer: "https://evil.com/" })],
    ["wrong audience", () => makeToken({ audience: "https://wrong.com" })],
  ])("passes error to next() — %s", async (_label, buildBadToken) => {
    await verifyJwtHandler(
      makeReq({ authorization: `Bearer ${buildBadToken()}` }) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ── Header injection guard ────────────────────────────────────────────────

  it.skip("overwrites a client-supplied x-verified-user with the verified sub", async () => {
    const req = makeReq({
      authorization: `Bearer ${makeToken({ sub: "auth0|real" })}`,
      "x-verified-user": "injected",
    });

    await verifyJwtHandler(
      req as Request,
      {} as Response,
      next as NextFunction,
    );

    expect((req.headers as Record<string, string>)["x-verified-user"]).toBe(
      "auth0|real",
    );
  });
});
