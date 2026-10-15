import type { Request, Response, NextFunction } from "express";
import { uuidv7 } from "uuidv7";

export const correlationIdHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = uuidv7();
  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
};
