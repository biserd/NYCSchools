import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Custom error class to preserve structured error data from API responses
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  
  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let errorCode: string | undefined;
    let errorDetails: any;
    
    try {
      const data = await res.json();
      errorMessage = data.message || data.error || res.statusText;
      errorCode = data.code;
      errorDetails = data;
    } catch {
      const text = await res.text().catch(() => "");
      errorMessage = text || res.statusText;
    }
    
    throw new ApiError(res.status, errorMessage, errorCode, errorDetails);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    try {
      const res = await fetch(url, {
        credentials: "include",
        // API responses are already cached in React Query. Avoid a browser-level
        // conditional 304 with an empty body, which cannot be parsed as JSON.
        cache: "no-store",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);

      // Some browser privacy/security tooling interferes with Response.json()
      // while leaving the response body intact. This previously broke the
      // magic-link flow and can also make every React Query request look failed
      // even though Cloudflare returned a valid 200 response. Read the body once
      // and parse it explicitly so auth and large school payloads use the same
      // hardened path as the passwordless flow.
      const responseText = await res.text();
      if (!responseText) {
        return null;
      }

      try {
        return JSON.parse(responseText);
      } catch (error) {
        throw new ApiError(
          res.status,
          "The service returned an invalid data response. Please retry.",
          "INVALID_JSON_RESPONSE",
          {
            url: res.url,
            contentType: res.headers.get("content-type"),
            responseLength: responseText.length,
            parseError: error instanceof Error ? error.message : String(error),
          },
        );
      }
    } catch (error) {
      const apiError = error instanceof ApiError ? error : undefined;
      console.error("[API_QUERY_FAILED] " + JSON.stringify({
        url,
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        status: apiError?.status,
        code: apiError?.code,
        details: apiError?.details,
      }));
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
