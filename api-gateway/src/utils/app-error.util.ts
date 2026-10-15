import type { ErrorCodeKey } from "../models/index.models.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCodeKey;

  constructor(message: string, statusCode: number, code: ErrorCodeKey) {
    super(message);

    this.name = "CustomApiError";
    this.statusCode = statusCode;
    this.errorCode = code;
  }
}
