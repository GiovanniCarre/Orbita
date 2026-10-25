export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let csrf: { token: string; headerName: string } | null = null;
export function resetCsrf() {
  csrf = null;
}

async function csrfToken() {
  if (!csrf) {
    const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    if (!response.ok)
      throw new ApiError(
        'Le serveur est indisponible. Réessayez dans un instant.',
        response.status,
      );
    csrf = await response.json();
  }
  return csrf!;
}

export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(method)) {
    const token = await csrfToken();
    headers[token.headerName] = token.token;
    if (options.body instanceof URLSearchParams) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = options.body;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'Connexion au serveur interrompue. Vos modifications ne sont pas confirmées.',
      0,
    );
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    if (response.status === 401) {
      resetCsrf();
      window.dispatchEvent(new Event('orbita:session-expired'));
    }
    throw new ApiError(
      problem.message || 'L’action a échoué. Réessayez après actualisation.',
      response.status,
    );
  }
  if (path === '/api/auth/login' || path === '/api/auth/logout') resetCsrf();
  if (response.status === 204 || response.headers.get('Content-Length') === '0')
    return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function download(path: string, filename: string) {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new ApiError(problem.message || 'L’export a échoué.', response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
