import type { Request, Response, NextFunction } from "express";
import Jwt from "jsonwebtoken";
import JwksRsa, { JwksClient } from "jwks-rsa";

import { AppError } from "../utils/app-error.util.js";
import { ErrorCodes } from "../utils/constants.js";
import type { JwksKeyInfo } from "../models/index.models.js";
import { getFutureExpiryTimeInMilliSeconds } from "../utils/utilities.js";
import apiGatewayLogger from "../utils/logger.js";

const jwksSigningKeys = new Map<string, JwksKeyInfo>();

function extractToken(req: Request): string {
  try {
    return req.headers["authorization"]?.slice(7) ?? "";
  } catch {
    apiGatewayLogger.error("Token extract error.", {
      method: req.method,
      correlationId: req.correlationId,
      path: req.originalUrl,
      sourceIp: req.ip || "not-detectable",
      timestamp: new Date().toISOString(),
    });
    return "";
  }
}

function decodeToken(token: string): Jwt.Jwt | null {
  return Jwt.decode(token, { complete: true });
}

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
    jwksUri: process.env.AUTH0_JWKS_URL ?? "",
  };

  const client = new JwksClient(jwksOptions);
  let signingKey = await client.getSigningKey(kid);
  jwksSigningKeys.set(kid, {
    key: signingKey,
    expiryInMilliSeconds: expiryInMilliSeconds,
  });
  return Promise.resolve();
}

export async function verifyJwtHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    /**
     * extract authorization token from req.headers
     */
    const token: string = extractToken(req);
    if (!token) {
      apiGatewayLogger.error("Token extract error.", {
        method: req.method,
        correlationId: req.correlationId,
        path: req.originalUrl,
        sourceIp: req.ip || "not-detectable",
        timestamp: new Date().toISOString(),
      });
      throw new AppError("Token extract error", 401, ErrorCodes.UNAUTHORIZED);
    }
    apiGatewayLogger.info("Bearer token extracted.", {
      method: req.method,
      correlationId: req.correlationId,
      path: req.originalUrl,
      sourceIp: req.ip || "not-detectable",
      timestamp: new Date().toISOString(),
    });

    /**
     * decode token to get the kid from the jwt
     * kid will be used to determine correct public key from jwks endpoint response
     */
    const decoded = decodeToken(token);
    if (!decoded || !decoded?.header) {
      apiGatewayLogger.error("Token decode error.", {
        method: req.method,
        correlationId: req.correlationId,
        path: req.originalUrl,
        sourceIp: req.ip || "not-detectable",
        timestamp: new Date().toISOString(),
      });
      throw new AppError("Token decode error", 401, ErrorCodes.UNAUTHORIZED);
    }
    apiGatewayLogger.info("Token decoded.", {
      method: req.method,
      correlationId: req.correlationId,
      path: req.originalUrl,
      sourceIp: req.ip || "not-detectable",
      timestamp: new Date().toISOString(),
    });

    const kid = decoded.header.kid ?? "";
    if (!kid) {
      apiGatewayLogger.error("Token kid error.", {
        method: req.method,
        correlationId: req.correlationId,
        path: req.originalUrl,
        sourceIp: req.ip || "not-detectable",
        timestamp: new Date().toISOString(),
      });
      throw new AppError("Token kid error", 401, ErrorCodes.UNAUTHORIZED);
    }
    apiGatewayLogger.info("Token kid extracted", {
      method: req.method,
      correlationId: req.correlationId,
      path: req.originalUrl,
      sourceIp: req.ip || "not-detectable",
      timestamp: new Date().toISOString(),
    });

    /**
     * check if signing keys already available in memory and are valid.
     * if no existing key, call jwks endpoint to get public keys and save them in memory with an expiry
     * during jwt verification, first check the in-memory keys, and if expired, then
     * obtain again from jwks url
     */
    const existingKey = extractSigningKeyUsingKid(kid);
    let shouldDownloadJwksKey = false;
    if (!existingKey || existingKey.expiryInMilliSeconds <= Date.now()) {
      shouldDownloadJwksKey = true;
    }
    apiGatewayLogger.info(`Download Jwks Key: ${shouldDownloadJwksKey}`, {
      method: req.method,
      correlationId: req.correlationId,
      path: req.originalUrl,
      sourceIp: req.ip || "not-detectable",
      timestamp: new Date().toISOString(),
    });

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
      apiGatewayLogger.error("Signing key error.", {
        method: req.method,
        correlationId: req.correlationId,
        path: req.originalUrl,
        sourceIp: req.ip || "not-detectable",
        timestamp: new Date().toISOString(),
      });
      throw new AppError("Signing key error", 401, ErrorCodes.UNAUTHORIZED);
    }
    const publicKey = signingKeyToUse?.key.getPublicKey();
    const verified = Jwt.verify(token, publicKey, {
      issuer: process.env.AUTH0_ISSUER,
      audience: process.env.AUTH0_AUDIENCE,
      complete: true,
    });
    if (!verified) {
      apiGatewayLogger.error("Invalid user identity.", {
        method: req.method,
        correlationId: req.correlationId,
        path: req.originalUrl,
        sourceIp: req.ip || "not-detectable",
        timestamp: new Date().toISOString(),
      });
      throw new AppError("Invalid user identity", 401, ErrorCodes.UNAUTHORIZED);
    }

    delete req.headers["x-verified-user"];

    const userId = verified.payload.sub?.toString();
    req.headers["x-verified-user"] = userId;
    apiGatewayLogger.info("Token verify successful.", {
      method: req.method,
      correlationId: req.correlationId,
      path: req.originalUrl,
      sourceIp: req.ip || "not-detectable",
      timestamp: new Date().toISOString(),
      userId: userId,
    });

    next();
  } catch (error) {
    apiGatewayLogger.error("Auth middleware error.", {
      method: req.method,
      correlationId: req.correlationId,
      path: req.originalUrl,
      sourceIp: req.ip || "not-detectable",
      timestamp: new Date().toISOString(),
    });
    next(error);
  }
}
