import type JwksRsa from "jwks-rsa";
import type { ErrorCodes } from "../utils/constants.js";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAtUtc?: string;
  updatedAtUtc?: string;
}

export interface UserInput {
  name: string;
  email: string;
}

export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T | null;
  error: ApiErrorDetails | null;
}

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ApiErrorDetails {
  code: ErrorCode;
  details?: unknown;
}

export type ErrorCodeKey = keyof typeof ErrorCodes;

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

// Extend Express Request so route handlers can read user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface ProxyRouteOptions {
  prefix: string; // path prefix for public url
  target: string; // internal api url
  pathRewrite?: (path: string) => string;
}

export interface GatewayRoute {
  route: string; // public facing route path
  target: string; // internal api full url
}

export interface JwksKeyInfo {
  key: JwksRsa.SigningKey;
  expiryInMilliSeconds: number;
}
