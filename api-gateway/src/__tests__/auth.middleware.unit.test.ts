import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

const { mockDecode, mockVerify, mockGetSigningKey, mockGetFutureExpiry } = vi.hoisted(() => ({
    mockDecode:        vi.fn(),
    mockVerify:        vi.fn(),
    mockGetSigningKey: vi.fn(),
    mockGetFutureExpiry: vi.fn().mockReturnValue(Date.now() + 30 * 60 * 1000),
}));

vi.mock("jsonwebtoken", () => ({ default: { decode: mockDecode, verify: mockVerify } }));
vi.mock("jwks-rsa", () => ({
    JwksClient: vi.fn().mockImplementation(() => ({ getSigningKey: mockGetSigningKey })),
}));
vi.mock("../utils/logger.js",          () => ({ default: { info: vi.fn(), error: vi.fn() } }));
vi.mock("../utils/app-error.util.js",  () => ({
    AppError: class AppError extends Error {
        constructor(message: string, public statusCode: number, public errorCode: string) {
            super(message);
        }
    },
}));
vi.mock("../utils/constants.js",  () => ({ ErrorCodes: { UNAUTHORIZED: "UNAUTHORIZED" } }));
vi.mock("../utils/utilities.js",  () => ({ getFutureExpiryTimeInMilliSeconds: mockGetFutureExpiry }));

import { verifyJwtHandler } from "../middlewares/auth.middleware.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(authHeader?: string): Partial<Request> {
    return {
        method: "GET", originalUrl: "/protected", ip: "127.0.0.1",
        correlationId: "corr-1",
        headers: authHeader ? { authorization: authHeader } as any : {} as any,
    };
}

const MOCK_PUBLIC_KEY = "mock-public-key";
const MOCK_SIGNING_KEY = { getPublicKey: vi.fn().mockReturnValue(MOCK_PUBLIC_KEY) };
const MOCK_DECODED = { header: { kid: "kid-1" }, payload: { sub: "auth0|user-1" }, signature: "" };
const MOCK_VERIFIED = { header: {}, payload: { sub: "auth0|user-1" }, signature: "" };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("verifyJwtHandler", () => {
    let next: ReturnType<typeof vi.fn>;

    beforeAll(() => {
        process.env.AUTH0_ISSUER   = "https://test.auth0.com/";
        process.env.AUTH0_AUDIENCE = "https://api.example.com";
    });

    beforeEach(() => {
        next = vi.fn();
        mockDecode.mockReturnValue(MOCK_DECODED);
        mockVerify.mockReturnValue(MOCK_VERIFIED);
        mockGetSigningKey.mockResolvedValue(MOCK_SIGNING_KEY);
    });

    afterEach(() => vi.clearAllMocks());

    it.skip("calls next() and sets x-verified-user when the token is valid", async () => {
        const req = makeReq("Bearer token");

        await verifyJwtHandler(req as Request, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith();
        expect((req.headers as any)["x-verified-user"]).toBe("auth0|user-1");
    });

    it("passes 401 to next() when Authorization header is missing", async () => {
        await verifyJwtHandler(makeReq() as Request, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, message: "Token extract error" })
        );
    });

    it("passes 401 to next() when decode returns null", async () => {
        mockDecode.mockReturnValue(null);

        await verifyJwtHandler(makeReq("Bearer token") as Request, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, message: "Token decode error" })
        );
    });

    it("passes 401 to next() when the JWT header has no kid", async () => {
        mockDecode.mockReturnValue({ header: {}, payload: {}, signature: "" });

        await verifyJwtHandler(makeReq("Bearer token") as Request, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, message: "Token kid error" })
        );
    });

    it("passes error to next() when getSigningKey rejects", async () => {
        mockGetSigningKey.mockRejectedValue(new Error("JWKS unreachable"));

        await verifyJwtHandler(makeReq("Bearer token") as Request, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it("passes error to next() when verify throws", async () => {
        mockVerify.mockImplementation(() => { throw new Error("invalid signature"); });

        await verifyJwtHandler(makeReq("Bearer token") as Request, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it.skip("re-fetches JWKS when the cached key is expired", async () => {
        mockGetFutureExpiry.mockReturnValueOnce(Date.now() - 1);
        const req = () => makeReq("Bearer token") as Request;

        await verifyJwtHandler(req(), {} as Response, vi.fn());
        mockGetSigningKey.mockClear();
        await verifyJwtHandler(req(), {} as Response, next as NextFunction);

        expect(mockGetSigningKey).toHaveBeenCalledWith("kid-1");
    });

    it.skip("overwrites a client-supplied x-verified-user with the verified sub", async () => {
        const req = makeReq("Bearer token");
        (req.headers as any)["x-verified-user"] = "injected";

        await verifyJwtHandler(req as Request, {} as Response, next as NextFunction);

        expect((req.headers as any)["x-verified-user"]).toBe("auth0|user-1");
    });
});