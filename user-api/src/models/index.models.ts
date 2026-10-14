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