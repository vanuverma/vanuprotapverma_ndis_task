import type { Request, Response, NextFunction } from "express";
import Jwt from "jsonwebtoken";
import JwksRsa, { JwksClient } from "jwks-rsa";

import { AppError } from "../utils/app-error.util.js";
import { ErrorCodes } from "../utils/constants.js";
import type { JwksKeyInfo } from "../models/index.models.js";
import { getFutureExpiryTimeInMilliSeconds } from "../utils/utilities.js";

// TODO change value type
const jwksSigningKeys = new Map<string, JwksKeyInfo>();

function extractToken(req: Request): string {
    try {
        return req.headers["authorization"]?.slice(7) ?? "";
    } catch (e) {
        console.log(`Token extract error. ${e}`);
        return "";
    }
}

function decodeToken(token: string): Jwt.Jwt | null {
    return Jwt.decode(token, { complete: true });
}

// TODO change signature
function extractSigningKeyUsingKid(kid: string): JwksKeyInfo | undefined {
    if (!kid || !jwksSigningKeys.has(kid)) {
        return undefined;
    }
    return jwksSigningKeys.get(kid);
}

async function downloadJwksKeysFromRemote(kid: string): Promise<void> {
    const expiryInMilliSeconds: number = getFutureExpiryTimeInMilliSeconds(30);
    const jwksOptions: JwksRsa.Options = {
        cache: true,
        cacheMaxAge: expiryInMilliSeconds,
        rateLimit: true,
        jwksUri: process.env.AUTH0_JWKS_URL ?? ""
    }

    const client = new JwksClient(jwksOptions);
    let signingKey = await client.getSigningKey(kid);
    jwksSigningKeys.set(kid, {
        key: signingKey,
        expiryInMilliSeconds: expiryInMilliSeconds
    });
    return Promise.resolve();
}

export async function verifyJwt(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        /**
         * extract authorization token from req.headers
         */
        const token: string = extractToken(req);
        if (!token) {
            throw new AppError("Token extract error", 401, ErrorCodes.UNAUTHORIZED);
        }
        console.log("Bearer token extracted");

        /**
         * decode token to get the kid from the jwt
         * kid will be used to determine correct public key from jwks endpoint response
         */
        const decoded = decodeToken(token);
        if (!decoded ||
            !decoded?.header
        ) {
            throw new AppError("Token decode error", 401, ErrorCodes.UNAUTHORIZED);
        }
        console.log("Token decoded");


        const kid = decoded.header.kid ?? "";
        if (!kid) {
            throw new AppError("Token kid error", 401, ErrorCodes.UNAUTHORIZED);
        }
        console.log("Token kid extracted");

        /**
         * check if signing keys already available in memory and are valid.
         * if no existing key, call jwks endpoint to get public keys and save them in memory with an expiry
         * during jwt verification, first check the in-memory keys, and if expired, then 
         * obtain again from jwks url
         */
        const existingKey = extractSigningKeyUsingKid(kid);
        console.log(`existingKey: ${existingKey}`);

        let shouldDownloadJwksKey = false;
        if (!existingKey || existingKey.expiryInMilliSeconds <= Date.now()) {
            shouldDownloadJwksKey = true;
        }
        console.log(`shouldDownloadJwksKey: ${shouldDownloadJwksKey}`);

        /**
         * call jwks url if needed
         */
        if (shouldDownloadJwksKey) {
            await downloadJwksKeysFromRemote(kid);
            shouldDownloadJwksKey = false;
        }

        /**
         * perform actual jwt verification, and if success, populate, req.user with sub/email value from jwt
         */
        const signingKeyToUse = jwksSigningKeys.get(kid);
        if (!signingKeyToUse) {
            throw new AppError("Signing key error", 401, ErrorCodes.UNAUTHORIZED);
        }
        const publicKey = signingKeyToUse?.key.getPublicKey();

        const verified = Jwt.verify(token, publicKey, {
            issuer: process.env.AUTH0_ISSUER,
            audience: process.env.AUTH0_AUDIENCE,
            complete: true
        });
        if (!verified) {
            throw new AppError("Invalid user identity", 401, ErrorCodes.UNAUTHORIZED);
        }


        delete req.headers["x-verified-user"];

        const userId = verified.payload.sub?.toString();
        req.headers["x-verified-user"] = userId;

        next();
    } catch (error) {
        console.log(`Auth middleware error ${error}`);
        next(error);
    }
}
