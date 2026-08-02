import { API_BASE_URL } from "../config/api";

export interface IdentityApiError {
  code: string;
  description: string;
}

export interface ApiProblem {
  errorCode?: string;
  message?: string;
  errors?: Record<string, string[]>;
  identityErrors?: IdentityApiError[];
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode?: string;
  public readonly errors?: Record<
    string,
    string[]
  >;

  public readonly identityErrors?: IdentityApiError[];

  public constructor(
    status: number,
    message: string,
    problem?: ApiProblem,
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.errorCode = problem?.errorCode;
    this.errors = problem?.errors;
    this.identityErrors =
      problem?.identityErrors;
  }
}

function buildUrl(path: string): string {
  const normalizedPath =
    path.startsWith("/") ? path : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`,
    );
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      "The backend could not be reached. Check your connection and API configuration.",
    );
  }

  if (!response.ok) {
    let problem: ApiProblem | undefined;

    try {
      problem =
        (await response.json()) as ApiProblem;
    } catch {
      problem = undefined;
    }

    throw new ApiError(
      response.status,
      problem?.message ??
        `The request failed with status ${response.status}.`,
      problem,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType =
    response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}