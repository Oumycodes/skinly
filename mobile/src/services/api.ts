const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Cannot reach API at ${API_BASE_URL}. Restart Expo with: npm run start:clear`,
      0,
    );
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body || response.statusText;
    try {
      const parsed = JSON.parse(body) as { detail?: string };
      if (parsed.detail) message = parsed.detail;
    } catch {
      // keep raw body
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
