import type { ApiResponse } from "../models/user.models.js";

export function populateApiResponse(status: number, message: string, data: any): ApiResponse {
  const response: ApiResponse = {
    data: data,
    status: status,
    message: message
  };
  return response;
}