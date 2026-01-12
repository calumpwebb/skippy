import { describe, test, expect } from 'vitest';
import { Endpoint, ToolName, LogLevel } from '../src/constants';

describe('Endpoint', () => {
  test('has all required endpoints', () => {
    expect(Endpoint.ITEMS).toBe('items');
    expect(Endpoint.ARCS).toBe('arcs');
    expect(Endpoint.QUESTS).toBe('quests');
    expect(Endpoint.TRADERS).toBe('traders');
    expect(Endpoint.EVENTS).toBe('events');
  });

  test('endpoints are exhaustive (5 total)', () => {
    const endpoints = Object.values(Endpoint);
    expect(endpoints).toHaveLength(5);
  });
});

describe('ToolName', () => {
  test('has all required tool names', () => {
    expect(ToolName.SEARCH_ITEMS).toBe('search_items');
    expect(ToolName.SEARCH_ARCS).toBe('search_arcs');
    expect(ToolName.SEARCH_QUESTS).toBe('search_quests');
    expect(ToolName.SEARCH_TRADERS).toBe('search_traders');
    expect(ToolName.GET_EVENTS).toBe('get_events');
  });

  test('tool names are exhaustive (5 total)', () => {
    const tools = Object.values(ToolName);
    expect(tools).toHaveLength(5);
  });
});

describe('LogLevel', () => {
  test('has all log levels', () => {
    expect(LogLevel.DEBUG).toBe('debug');
    expect(LogLevel.INFO).toBe('info');
    expect(LogLevel.WARN).toBe('warn');
    expect(LogLevel.ERROR).toBe('error');
  });
});