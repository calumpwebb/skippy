import { Endpoint } from '@skippy/shared';

export const METAFORGE_BASE_URL = 'https://metaforge.app/api/arc-raiders';

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

interface PaginatedResponse {
  data: unknown[];
  pagination?: {
    hasNextPage: boolean;
    page: number;
    totalPages: number;
  };
}

/** Downloads a single page from a MetaForge API endpoint. */
async function downloadPage(endpoint: Endpoint, page: number = 1): Promise<PaginatedResponse> {
  const url = `${METAFORGE_BASE_URL}/${endpoint}?page=${page}`;

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

      return response.json() as Promise<PaginatedResponse>;
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

  throw new Error('Max retries exceeded');
}

/** Downloads all pages from a MetaForge API endpoint. */
export async function downloadEndpoint(endpoint: Endpoint): Promise<unknown> {
  // First page to check structure
  const firstResponse = await downloadPage(endpoint, 1);

  // If no pagination or data isn't an array (e.g., traders), return as-is
  if (!firstResponse.pagination || !Array.isArray(firstResponse.data)) {
    return firstResponse;
  }

  // Paginated endpoint - collect all pages
  const allData: unknown[] = [...firstResponse.data];
  let page = 2;
  let hasMore = firstResponse.pagination.hasNextPage;

  while (hasMore) {
    const response = await downloadPage(endpoint, page);

    if (Array.isArray(response.data)) {
      allData.push(...response.data);
    }

    hasMore = response.pagination?.hasNextPage ?? false;
    page++;

    // Safety limit
    if (page > 100) break;
  }

  return { data: allData };
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

  const wrapper = response as Record<string, unknown>;

  // Most endpoints return { data: [...] } format
  if (Array.isArray(wrapper.data)) {
    return wrapper.data;
  }

  // Traders endpoint returns { data: { "TraderName": [...items] } }
  if (endpoint === Endpoint.TRADERS && typeof wrapper.data === 'object' && wrapper.data !== null) {
    const tradersObj = wrapper.data as Record<string, unknown[]>;
    return Object.entries(tradersObj).map(([name, items]) => ({
      name,
      items: Array.isArray(items) ? items : [],
    }));
  }

  return [];
}

/** Downloads and normalizes data from an endpoint. */
export async function downloadAndNormalize(endpoint: Endpoint): Promise<unknown[]> {
  const raw = await downloadEndpoint(endpoint);
  return normalizeResponse(endpoint, raw);
}
