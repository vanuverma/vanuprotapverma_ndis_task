import type { ApiErrorDetails, ApiResponse } from "../models/index.models.js";

export function populateApiResponse<T>(
  status: number,
  message: string,
  data: T | null,
  error: ApiErrorDetails | null,
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    error,
    data,
    status,
    message,
  };
  return response;
}

export function getFutureExpiryTimeInMilliSeconds(
  minutesFromNow: number = 10,
): number {
  const now = Date.now();

  // limiting the expiry range
  if (minutesFromNow < 10) {
    return now + 600000; // 10 minutes
  } else if (minutesFromNow > 60) {
    return now + 3600000; // 60 minutes
  } else {
    return now + minutesFromNow * 1000 * 60;
  }
}
