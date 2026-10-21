// Empty locally (Vite proxies /api); on Vercel, VITE_API_URL is the API origin.
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const TOKEN_KEY = "authToken";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const isAuthTokenKey = (key: string | null) => key === null || key === TOKEN_KEY;

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked: the session lasts until the page is reloaded.
  }
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing stored to clear.
  }
};

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

// Reads the auth token synchronously when called, before the first await.
export const apiRequest = async <T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {}
): Promise<T> => {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Files (Blob) are sent as-is with their own type; everything else as JSON.
  const isFile = body instanceof Blob;
  if (body !== undefined) {
    headers["Content-Type"] = isFile ? body.type : "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFile ? body : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Please check your connection and try again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
      ? data.error
      : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return data as T;
};
