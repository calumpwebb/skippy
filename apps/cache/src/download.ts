import { Endpoint } from '@skippy/shared';

export const METAFORGE_BASE_URL = 'https://metaforge.gg/api/arc-raiders';

const FETCH_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024; // 50MB

/** Validates the fetch response and throws appropriate errors. */
function validateResponse(response: Response): void {
  if (!response.ok) {
    const isClientError = response.status >= 400 && response.status < 500;
    const errorType = isClientError ? 'Client' : 'Server';
    throw new Error(`${errorType} error ${response.status}: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
    throw new Error('Response too large (>50MB)');
  }
}

/** Downloads data from a MetaForge API endpoint. */
export async function downloadEndpoint(endpoint: Endpoint): Promise<unknown> {
  const url = `${METAFORGE_BASE_URL}/${endpoint}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Skippy/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      validateResponse(response);

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt < MAX_RETRIES - 1 && shouldRetry(error)) {
        const delay = RETRY_DELAYS[attempt] ?? 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  // TypeScript needs this for completeness, but it should never be reached
  throw new Error('Max retries exceeded');
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('Server error');
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Extracts the data array from API response wrapper. */
export function normalizeResponse(endpoint: Endpoint, response: unknown): unknown[] {
  if (typeof response !== 'object' || response === null) {
    return [];
  }

  const data = response as Record<string, unknown>;

  switch (endpoint) {
    case Endpoint.ITEMS:
      return Array.isArray(data.items) ? data.items : [];
    case Endpoint.ARCS:
      return Array.isArray(data.arcs) ? data.arcs : [];
    case Endpoint.QUESTS:
      return Array.isArray(data.quests) ? data.quests : [];
    case Endpoint.TRADERS:
      return Array.isArray(data.traders) ? data.traders : [];
    case Endpoint.EVENTS: {
      const schedule = data.events_schedule as Record<string, unknown> | undefined;
      return Array.isArray(schedule?.events) ? schedule.events : [];
    }
    default:
      return [];
  }
}

/** Downloads and normalizes data from an endpoint. */
export async function downloadAndNormalize(endpoint: Endpoint): Promise<unknown[]> {
  const raw = await downloadEndpoint(endpoint);
  return normalizeResponse(endpoint, raw);
}
