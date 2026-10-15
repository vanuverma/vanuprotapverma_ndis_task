import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error.util.js";
import { ErrorCodes } from "../utils/constants.js";
import type { ApiResponse, ErrorCode } from "../models/index.models.js";
import apiGatewayLogger from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next,
): void => {
  // The response has already started.
  if (res.headersSent) {
    next(err);
    return;
  }

  let statusCode = 500;
  let message = "Internal server error";
  let code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.errorCode;
  } else {
    apiGatewayLogger.error("Application error.", {
      method: req.method,
      correlationId: req.correlationId,
      path: req.path,
      sourceIp: req.ip || "not-detectable",
      timestamp: new Date().toISOString(),
    });
  }

  const response: ApiResponse = {
    status: statusCode,
    message,
    data: null,
    error: {
      code: code,
    },
  };

  res.status(statusCode).json(response);
};
