import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseCSV, loadCSV, csvExists, loadSeasonData } from '../../lib/csv-loader.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SIMPLE_CSV = `name,team,points
Hamilton,Mercedes,364
Verstappen,Red Bull,454`;

const QUOTED_CSV = `name,nationality,notes
"Hamilton, Lewis",British,"Fast driver, consistent"
"Verstappen, Max",Dutch,"Champion, multiple"`;

const ESCAPED_QUOTE_CSV = `name,quote
"Driver ""A""","He said ""hello"""`;

// ─── parseCSV ────────────────────────────────────────────────────────────────

describe('parseCSV', () => {
  it('parses a simple CSV into an array of row objects', () => {
    const rows = parseCSV(SIMPLE_CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Hamilton', team: 'Mercedes', points: '364' });
    expect(rows[1]).toEqual({ name: 'Verstappen', team: 'Red Bull', points: '454' });
  });

  it('handles Windows line endings (\\r\\n)', () => {
    const csv = 'name,value\r\nfoo,bar\r\nbaz,qux';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'foo', value: 'bar' });
    expect(rows[1]).toEqual({ name: 'baz', value: 'qux' });
  });

  it('handles carriage-return-only line endings (\\r)', () => {
    const csv = 'name,value\rfoo,bar';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: 'foo', value: 'bar' });
  });

  it('parses quoted fields that contain commas', () => {
    const rows = parseCSV(QUOTED_CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Hamilton, Lewis');
    expect(rows[0].notes).toBe('Fast driver, consistent');
  });

  it('parses escaped double-quotes inside quoted fields', () => {
    const rows = parseCSV(ESCAPED_QUOTE_CSV);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Driver "A"');
    expect(rows[0].quote).toBe('He said "hello"');
  });

  it('returns an empty array for a CSV that has only a header row', () => {
    const rows = parseCSV('name,team,points');
    expect(rows).toHaveLength(0);
  });

  it('fills missing values with empty string', () => {
    const rows = parseCSV('a,b,c\n1,,3');
    expect(rows[0]).toEqual({ a: '1', b: '', c: '3' });
  });

  it('trims leading/trailing whitespace from fields', () => {
    const rows = parseCSV('name, team\nHamilton, Mercedes');
    expect(rows[0].team).toBe('Mercedes');
  });
});

// ─── loadCSV ─────────────────────────────────────────────────────────────────

describe('loadCSV', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches and parses a CSV file successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => SIMPLE_CSV
    });
    const rows = await loadCSV('data/canonical/drivers_2026.csv');
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Hamilton');
    expect(global.fetch).toHaveBeenCalledWith('data/canonical/drivers_2026.csv', { cache: 'no-cache' });
  });

  it('throws when the HTTP response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(loadCSV('not-found.csv')).rejects.toThrow('Failed to load CSV');
  });

  it('re-throws when fetch itself rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(loadCSV('some.csv')).rejects.toThrow('Network error');
  });
});

// ─── csvExists ───────────────────────────────────────────────────────────────

describe('csvExists', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns true when the HEAD request succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const result = await csvExists('data/canonical/drivers_2026.csv');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'data/canonical/drivers_2026.csv',
      { method: 'HEAD', cache: 'no-cache' }
    );
  });

  it('returns false when the HEAD request returns a non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await csvExists('not-found.csv');
    expect(result).toBe(false);
  });

  it('returns false when fetch throws a network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await csvExists('some.csv');
    expect(result).toBe(false);
  });
});

// ─── loadSeasonData ──────────────────────────────────────────────────────────

describe('loadSeasonData', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  const okResponse = (csvContent) => ({
    ok: true,
    text: async () => csvContent
  });

  it('returns all seven data arrays on a full successful load', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse('id,name\n1,Test'));
    const data = await loadSeasonData(2026);
    expect(data).toMatchObject({
      drivers: expect.any(Array),
      constructors: expect.any(Array),
      races: expect.any(Array),
      driverStandings: expect.any(Array),
      constructorStandings: expect.any(Array),
      raceResults: expect.any(Array),
      qualifying: expect.any(Array)
    });
  });

  it('returns empty arrays for optional files when they respond with 404', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('race_results') || url.includes('qualifying')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve(okResponse('id,name\n1,Test'));
    });
    const data = await loadSeasonData(2026);
    expect(data.raceResults).toEqual([]);
    expect(data.qualifying).toEqual([]);
  });

  it('requests files with the correct season year in the path', async () => {
    const urls = [];
    global.fetch = vi.fn().mockImplementation((url) => {
      urls.push(url);
      return Promise.resolve(okResponse('id\n1'));
    });
    await loadSeasonData(2025);
    expect(urls.some(u => u.includes('drivers_2025.csv'))).toBe(true);
    expect(urls.some(u => u.includes('constructors_2025.csv'))).toBe(true);
    expect(urls.some(u => u.includes('races_2025.csv'))).toBe(true);
    expect(urls.some(u => u.includes('driver_standings_2025.csv'))).toBe(true);
    expect(urls.some(u => u.includes('constructor_standings_2025.csv'))).toBe(true);
  });

  it('throws when a required file fails to load', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(loadSeasonData(2026)).rejects.toThrow();
  });
});

// ─── parseCSV dead-code branch ───────────────────────────────────────────────
// lines.length === 0 is unreachable via normal strings, so we verify the guard
// exists by monkey-patching String.prototype.split for one call.
describe('parseCSV - empty-lines guard (internal dead branch)', () => {
  it('returns [] when split produces an empty array (patched)', () => {
    const origSplit = String.prototype.split;
    String.prototype.split = function () { return []; };
    let result;
    try {
      result = parseCSV('a,b\n1,2');
    } finally {
      String.prototype.split = origSplit;
    }
    expect(result).toEqual([]);
  });
});
