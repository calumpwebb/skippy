import { describe, test, expect, vi, beforeEach } from 'vitest';
import { downloadEndpoint, normalizeResponse, METAFORGE_BASE_URL } from '../src/download';
import { Endpoint } from '@skippy/shared';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('downloadEndpoint', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test('constructs correct URL for items endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
      headers: { get: () => null },
    });

    await downloadEndpoint(Endpoint.ITEMS);

    expect(mockFetch).toHaveBeenCalledWith(`${METAFORGE_BASE_URL}/items`, expect.any(Object));
  });

  test('constructs correct URL for arcs endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ arcs: [] }),
      headers: { get: () => null },
    });

    await downloadEndpoint(Endpoint.ARCS);

    expect(mockFetch).toHaveBeenCalledWith(`${METAFORGE_BASE_URL}/arcs`, expect.any(Object));
  });

  test('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map(),
    });

    await expect(downloadEndpoint(Endpoint.ITEMS)).rejects.toThrow('404');
  });

  test('returns parsed JSON data', async () => {
    const mockData = { items: [{ id: '1', name: 'Test Item' }] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      headers: { get: () => null },
    });

    const result = await downloadEndpoint(Endpoint.ITEMS);

    expect(result).toEqual(mockData);
  });

  test('retries on server error then succeeds', async () => {
    const mockData = { items: [] };
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => null },
      });

    const result = await downloadEndpoint(Endpoint.ITEMS);

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('does not retry on client error (4xx)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: () => null },
    });

    await expect(downloadEndpoint(Endpoint.ITEMS)).rejects.toThrow('Client error 400');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('retries on timeout then succeeds', async () => {
    const mockData = { items: [] };
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    mockFetch.mockRejectedValueOnce(abortError).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      headers: { get: () => null },
    });

    const result = await downloadEndpoint(Endpoint.ITEMS);

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('throws after max retries exceeded', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => null },
    });

    await expect(downloadEndpoint(Endpoint.ITEMS)).rejects.toThrow('Server error 500');
    expect(mockFetch).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3
  });

  test('rejects response over 50MB', async () => {
    const headers = new Map([['content-length', String(60 * 1024 * 1024)]]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (key: string) => headers.get(key) },
      json: async () => ({}),
    });

    await expect(downloadEndpoint(Endpoint.ITEMS)).rejects.toThrow('Response too large');
  });
});

describe('normalizeResponse', () => {
  test('extracts items array from response', () => {
    const response = { items: [{ id: '1' }, { id: '2' }] };

    const normalized = normalizeResponse(Endpoint.ITEMS, response);

    expect(normalized).toEqual([{ id: '1' }, { id: '2' }]);
  });

  test('extracts arcs array from response', () => {
    const response = { arcs: [{ id: 'arc-1' }] };

    const normalized = normalizeResponse(Endpoint.ARCS, response);

    expect(normalized).toEqual([{ id: 'arc-1' }]);
  });

  test('extracts quests array from response', () => {
    const response = { quests: [{ id: 'quest-1' }] };

    const normalized = normalizeResponse(Endpoint.QUESTS, response);

    expect(normalized).toEqual([{ id: 'quest-1' }]);
  });

  test('extracts traders array from response', () => {
    const response = { traders: [{ id: 'trader-1' }] };

    const normalized = normalizeResponse(Endpoint.TRADERS, response);

    expect(normalized).toEqual([{ id: 'trader-1' }]);
  });

  test('extracts events from schedule response', () => {
    const response = { events_schedule: { events: [{ id: 'event-1' }] } };

    const normalized = normalizeResponse(Endpoint.EVENTS, response);

    expect(normalized).toEqual([{ id: 'event-1' }]);
  });

  test('returns empty array if key not found', () => {
    const response = { unexpected: 'data' };

    const normalized = normalizeResponse(Endpoint.ITEMS, response);

    expect(normalized).toEqual([]);
  });
});
