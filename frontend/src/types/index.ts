export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: { field: string; message: string }[];
}

export interface ApiErrorBody {
  success: boolean;
  message: string;
  data: null;
  errors?: { field: string; message: string }[];
  retry_after?: number;
}
