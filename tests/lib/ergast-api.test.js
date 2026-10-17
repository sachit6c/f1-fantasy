// tests/lib/ergast-api.test.js
// Unit tests for the retry/backoff around the Jolpica fetch

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErgastAPI } from '../../lib/ergast-api.js';

const res = (status, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: name => headers[name] ?? null },
  json: async () => ({ ok: true }),
});

describe('ErgastAPI.fetchWithRetry', () => {
  let api;

  beforeEach(() => {
    api = new ErgastAPI();
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete window.fetch;
  });

  it('retries a 429 and returns the eventual success', async () => {
    window.fetch = vi.fn().mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(200));
    const promise = api.fetchWithRetry('https://example.test/x');
    await vi.runAllTimersAsync();
    expect((await promise).status).toBe(200);
    expect(window.fetch).toHaveBeenCalledTimes(2);
  });

  it('honours the Retry-After header', async () => {
    window.fetch = vi.fn().mockResolvedValueOnce(res(429, { 'Retry-After': '2' })).mockResolvedValueOnce(res(200));
    const promise = api.fetchWithRetry('https://example.test/x');
    await vi.advanceTimersByTimeAsync(1999);
    expect(window.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await promise).status).toBe(200);
  });

  it('does not retry a 404', async () => {
    window.fetch = vi.fn().mockResolvedValue(res(404));
    expect((await api.fetchWithRetry('https://example.test/x')).status).toBe(404);
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after the attempt limit and returns the last response', async () => {
    window.fetch = vi.fn().mockResolvedValue(res(503));
    const promise = api.fetchWithRetry('https://example.test/x', 3);
    await vi.runAllTimersAsync();
    expect((await promise).status).toBe(503);
    expect(window.fetch).toHaveBeenCalledTimes(3);
  });
});
