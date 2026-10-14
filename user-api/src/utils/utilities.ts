import type { ApiErrorDetails, ApiResponse } from "../models/index.models.js";

export function populateApiResponse<T>(
  status: number,
  message: string,
  data: T | null,
  error: ApiErrorDetails | null
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    error,
    data,
    status,
    message
  };
  return response;
}