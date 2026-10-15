import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import type { NextFunction, Request, Response } from "express";

const {
  mockDecode,
  mockVerify,
  mockGetSigningKey,
  mockGetFutureExpiry,
  MockJwksClient,
} = vi.hoisted(() => ({
  mockDecode: vi.fn(),
  mockVerify: vi.fn(),
  mockGetSigningKey: vi.fn(),
  mockGetFutureExpiry: vi.fn(),
  MockJwksClient: vi.fn(), // hoisted so it can be passed to vi.mock() factory below
}));

vi.mock("jsonwebtoken", () => ({
  default: { decode: mockDecode, verify: mockVerify },
}));
vi.mock("jwks-rsa", () => ({ JwksClient: MockJwksClient }));
vi.mock("../utils/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("../utils/constants.js", () => ({
  ErrorCodes: { UNAUTHORIZED: "UNAUTHORIZED" },
}));
vi.mock("../utils/utilities.js", () => ({
  getFutureExpiryTimeInMilliSeconds: mockGetFutureExpiry,
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

import { verifyJwtHandler } from "../middlewares/auth.middleware.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(headers: Record<string, string> = {}): Partial<Request> {
  return {
    method: "GET",
    originalUrl: "/protected",
    ip: "127.0.0.1",
    correlationId: "corr-1",
    headers: { ...headers } as any,
  };
}

const FUTURE = Date.now() + 30 * 60 * 1000;
const PAST = Date.now() - 1;

// Each test gets a unique kid so tests never share a cache entry
let kidCounter = 0;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("verifyJwtHandler", () => {
  let next: ReturnType<typeof vi.fn>;
  let kid: string;

  beforeAll(() => {
    process.env.AUTH0_ISSUER = "https://test.auth0.com/";
    process.env.AUTH0_AUDIENCE = "https://api.example.com";
  });

  beforeEach(() => {
    next = vi.fn();
    kid = `kid-${++kidCounter}`;

    mockGetFutureExpiry.mockReturnValue(FUTURE);
    mockDecode.mockReturnValue({
      header: { kid },
      payload: { sub: "auth0|user-1" },
      signature: "",
    });
    mockVerify.mockReturnValue({
      header: {},
      payload: { sub: "auth0|user-1" },
      signature: "",
    });

    // Regular function (not arrow) passed to mockImplementation so `new MockJwksClient()`
    // works correctly — arrow functions cannot be used as constructors
    MockJwksClient.mockImplementation(function () {
      return { getSigningKey: mockGetSigningKey };
    });
    mockGetSigningKey.mockResolvedValue({
      getPublicKey: vi.fn().mockReturnValue("mock-public-key"),
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("calls next() and sets x-verified-user on a valid token", async () => {
    const req = makeReq({ authorization: "Bearer token" });

    await verifyJwtHandler(req as Request, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect((req.headers as any)["x-verified-user"]).toBe("auth0|user-1");
  });

  it.each([
    ["missing Authorization header", {}],
    ["empty Authorization value", { authorization: "" }],
    ["Bearer with no token", { authorization: "Bearer " }],
  ])("passes 401 to next() — %s", async (_label, headers) => {
    await verifyJwtHandler(makeReq(headers) as Request, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Token extract error",
      }),
    );
  });

  it("passes 401 to next() when decode returns null", async () => {
    mockDecode.mockReturnValue(null);

    await verifyJwtHandler(
      makeReq({ authorization: "Bearer token" }) as Request,
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
    mockDecode.mockReturnValue({ header: {}, payload: {}, signature: "" });

    await verifyJwtHandler(
      makeReq({ authorization: "Bearer token" }) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: "Token kid error" }),
    );
  });

  it("passes error to next() when getSigningKey rejects", async () => {
    mockGetSigningKey.mockRejectedValue(new Error("JWKS unreachable"));

    await verifyJwtHandler(
      makeReq({ authorization: "Bearer token" }) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("passes error to next() when verify throws", async () => {
    mockVerify.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    await verifyJwtHandler(
      makeReq({ authorization: "Bearer token" }) as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("re-fetches JWKS when the cached key is expired", async () => {
    const req = () => makeReq({ authorization: "Bearer token" }) as Request;

    // First request — stores the key with an already-expired timestamp
    mockGetFutureExpiry.mockReturnValueOnce(PAST);
    await verifyJwtHandler(req(), {} as Response, vi.fn());

    mockGetSigningKey.mockClear();

    // Second request — expired cache entry must trigger a fresh download
    await verifyJwtHandler(req(), {} as Response, next as NextFunction);

    expect(mockGetSigningKey).toHaveBeenCalledWith(kid);
  });

  it("overwrites a client-supplied x-verified-user with the verified sub", async () => {
    const req = makeReq({
      authorization: "Bearer token",
      "x-verified-user": "injected",
    });

    await verifyJwtHandler(req as Request, {} as Response, next as NextFunction);

    expect((req.headers as any)["x-verified-user"]).toBe("auth0|user-1");
  });
});
