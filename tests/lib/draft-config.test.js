import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_DRAFT_CONFIG,
  DRAFT_TYPES,
  DRAFT_STATUS,
  createDraftConfig
} from '../../lib/draft-config.js';

describe('DEFAULT_DRAFT_CONFIG', () => {
  it('uses snake draft type', () => {
    expect(DEFAULT_DRAFT_CONFIG.draftType).toBe('snake');
  });

  it('has 2 players', () => {
    expect(DEFAULT_DRAFT_CONFIG.playerCount).toBe(2);
  });

  it('does not allow duplicate picks', () => {
    expect(DEFAULT_DRAFT_CONFIG.allowDuplicates).toBe(false);
  });

  it('defaults to the 2026 season', () => {
    expect(DEFAULT_DRAFT_CONFIG.season).toBe(2026);
  });
});

describe('DRAFT_TYPES', () => {
  it('exports SNAKE type', () => {
    expect(DRAFT_TYPES.SNAKE).toBe('snake');
  });

  it('exports FIXED type for backwards compatibility', () => {
    expect(DRAFT_TYPES.FIXED).toBe('fixed');
  });
});

describe('DRAFT_STATUS', () => {
  it('has SETUP status', () => {
    expect(DRAFT_STATUS.SETUP).toBe('setup');
  });

  it('has IN_PROGRESS status', () => {
    expect(DRAFT_STATUS.IN_PROGRESS).toBe('in_progress');
  });

  it('has COMPLETED status', () => {
    expect(DRAFT_STATUS.COMPLETED).toBe('completed');
  });

  it('has ABANDONED status', () => {
    expect(DRAFT_STATUS.ABANDONED).toBe('abandoned');
  });
});

describe('createDraftConfig', () => {
  it('sets rosterSize from dataStore.getTeamCount()', () => {
    const mockDataStore = { getTeamCount: vi.fn(() => 10) };
    const config = createDraftConfig(mockDataStore, 2026);
    expect(config.rosterSize).toBe(10);
    expect(mockDataStore.getTeamCount).toHaveBeenCalledOnce();
  });

  it('preserves base config properties', () => {
    const mockDataStore = { getTeamCount: vi.fn(() => 10) };
    const config = createDraftConfig(mockDataStore, 2026);
    expect(config.draftType).toBe('snake');
    expect(config.playerCount).toBe(2);
    expect(config.allowDuplicates).toBe(false);
  });

  it('sets the provided season', () => {
    const mockDataStore = { getTeamCount: vi.fn(() => 8) };
    const config = createDraftConfig(mockDataStore, 2025);
    expect(config.season).toBe(2025);
    expect(config.rosterSize).toBe(8);
  });

  it('defaults to season 2026 when no season argument is provided', () => {
    const mockDataStore = { getTeamCount: vi.fn(() => 10) };
    const config = createDraftConfig(mockDataStore);
    expect(config.season).toBe(2026);
  });

  it('reflects different team counts accurately', () => {
    const mockDataStore = { getTeamCount: vi.fn(() => 6) };
    const config = createDraftConfig(mockDataStore, 2026);
    expect(config.rosterSize).toBe(6);
  });
});
