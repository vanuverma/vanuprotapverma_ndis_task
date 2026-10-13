export interface User {
  id: string;
  name: string;
  email: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface UserInput {
  name: string;
  email: string;
}

export interface ApiResponse {
  status: number;
  message: string;
  data: any;
}
