import type { APIResponse, Page } from '@playwright/test';

type BackendMethod = 'get' | 'post' | 'put' | 'delete';

export const getBackendBaseCandidates = (): string[] => {
  const configuredBackend = process.env.PLAYWRIGHT_BACKEND_URL?.replace(
    /\/$/,
    '',
  );
  const configuredUi = process.env.PLAYWRIGHT_URL?.replace(/\/$/, '');
  const candidates = [
    configuredBackend,
    configuredUi,
    'http://localhost:7008',
  ].filter(Boolean) as string[];

  return [...new Set(candidates)];
};

export const getGuestAuthToken = async (
  page: Page,
  failureMessage = 'Failed to get backend auth token',
): Promise<string> => {
  for (const base of getBackendBaseCandidates()) {
    const response = await page.request.get(`${base}/api/auth/guest/refresh`);
    if (!response.ok()) {
      continue;
    }

    const body = await response.json().catch(() => undefined);
    const token = body?.backstageIdentity?.token as string | undefined;
    if (token) {
      return token;
    }
  }

  throw new Error(failureMessage);
};

export const requestScaffolderStudioApi = async (
  page: Page,
  {
    method,
    path,
    data,
    token,
  }: {
    method: BackendMethod;
    path: string;
    data?: unknown;
    token?: string;
  },
): Promise<{ response: APIResponse; base: string }> => {
  let lastResponse: APIResponse | undefined;
  let lastBase = '';

  for (const base of getBackendBaseCandidates()) {
    const response = await page.request[method](
      `${base}/api/scaffolder-studio${path}`,
      {
        data,
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      },
    );

    lastResponse = response;
    lastBase = base;

    if (response.status() !== 404) {
      return { response, base };
    }
  }

  if (!lastResponse) {
    throw new Error(
      `${method.toUpperCase()} /api/scaffolder-studio${path} failed: no response`,
    );
  }

  return { response: lastResponse, base: lastBase };
};
