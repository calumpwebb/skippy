import { describe, test, expect } from 'vitest';
import { Item } from '@skippy/shared';
import {
  SearchItemsParamsSchema,
  extractFields,
  validateFieldPath,
} from '../../src/tools/handlers/search-items';
import { validateFields, Schema } from '../../src/utils/schema';

describe('SearchItemsParamsSchema', () => {
  test('extends BaseSearchParamsSchema with query, fields, limit', () => {
    const valid = SearchItemsParamsSchema.parse({
      query: 'test item',
      limit: 5,
    });

    expect(valid.query).toBe('test item');
    expect(valid.limit).toBe(5);
  });

  test('rejects empty query', () => {
    expect(() => SearchItemsParamsSchema.parse({ query: '' })).toThrow();
  });

  test('accepts optional fields array', () => {
    const withFields = SearchItemsParamsSchema.parse({
      query: 'test',
      fields: ['name', 'description'],
    });
    expect(withFields.fields).toEqual(['name', 'description']);
  });
});

describe('validateFieldPath', () => {
  test('allows simple field paths', () => {
    expect(() => validateFieldPath('name')).not.toThrow();
    expect(() => validateFieldPath('stat_block')).not.toThrow();
  });

  test('allows nested field paths up to depth 4', () => {
    expect(() => validateFieldPath('a.b.c.d')).not.toThrow();
  });

  test('rejects paths deeper than 4 levels', () => {
    expect(() => validateFieldPath('a.b.c.d.e')).toThrow('Field path too deep');
  });

  test('rejects forbidden paths', () => {
    expect(() => validateFieldPath('__proto__')).toThrow('Invalid field path');
    expect(() => validateFieldPath('constructor')).toThrow('Invalid field path');
    expect(() => validateFieldPath('prototype')).toThrow('Invalid field path');
    expect(() => validateFieldPath('obj.__proto__')).toThrow('Invalid field path');
  });
});

describe('extractFields', () => {
  const sampleItem: Item = {
    id: 'test-item',
    name: 'Test Item',
    description: 'A test item for testing',
    item_type: 'weapon',
    loadout_slots: [],
    icon: 'icon.png',
    rarity: 'common',
    value: 100,
    workbench: null,
    stat_block: {
      range: 0,
      value: 0,
      damage: 0,
      health: 0,
      radius: 0,
      shield: 0,
      weight: 0,
      agility: 0,
      arcStun: 0,
      healing: 0,
      stamina: 0,
      stealth: 0,
      useTime: 0,
      duration: 0,
      fireRate: 0,
      stability: 0,
      stackSize: 0,
      damageMult: 0,
      raiderStun: 0,
      weightLimit: 0,
      augmentSlots: 0,
      healingSlots: 0,
      magazineSize: 0,
      reducedNoise: 0,
      shieldCharge: 0,
      backpackSlots: 0,
      quickUseSlots: 0,
      damagePerSecond: 0,
      movementPenalty: 0,
      safePocketSlots: 0,
      damageMitigation: 0,
      healingPerSecond: 0,
      reducedEquipTime: 0,
      staminaPerSecond: 0,
      increasedADSSpeed: 0,
      increasedFireRate: 0,
      reducedReloadTime: 0,
      illuminationRadius: 0,
      increasedEquipTime: 0,
      reducedUnequipTime: 0,
      shieldCompatibility: '',
      increasedUnequipTime: 0,
      reducedVerticalRecoil: 0,
      increasedBulletVelocity: 0,
      increasedVerticalRecoil: 0,
      reducedMaxShotDispersion: 0,
      reducedPerShotDispersion: 0,
      reducedDurabilityBurnRate: 0,
      reducedRecoilRecoveryTime: 0,
      increasedRecoilRecoveryTime: 0,
      reducedDispersionRecoveryTime: 0,
    },
    flavor_text: '',
    subcategory: '',
    created_at: '',
    updated_at: '',
    shield_type: '',
    loot_area: '',
    sources: null,
    ammo_type: '',
    locations: [],
    guide_links: [],
    game_asset_id: 0,
  };

  test('returns full item when no fields specified', () => {
    const result = extractFields(sampleItem, undefined);
    expect(result).toEqual(sampleItem);
  });

  test('returns full item when fields is empty array', () => {
    const result = extractFields(sampleItem, []);
    expect(result).toEqual(sampleItem);
  });

  test('extracts only requested fields', () => {
    const result = extractFields(sampleItem, ['name', 'value']);
    expect(result).toEqual({ name: 'Test Item', value: 100 });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('description');
  });

  test('extracts nested fields using dot notation', () => {
    const result = extractFields(sampleItem, ['stat_block.range']);
    expect(result).toEqual({ 'stat_block.range': 0 });
  });

  test('extracts deeply nested fields', () => {
    const result = extractFields(sampleItem, ['stat_block.range']);
    expect(result).toEqual({ 'stat_block.range': 0 });
  });

  test('omits fields that do not exist', () => {
    const result = extractFields(sampleItem, ['name', 'nonexistent']);
    expect(result).toEqual({ name: 'Test Item' });
    expect(result).not.toHaveProperty('nonexistent');
  });
});

describe('field validation', () => {
  const mockSchema: Schema = {
    fields: ['id', 'name', 'description', 'item_type', 'value', 'stat_block.damage'],
  };

  test('validateFields accepts valid fields', () => {
    expect(() => validateFields(mockSchema, ['name', 'description'])).not.toThrow();
  });

  test('validateFields accepts nested field paths', () => {
    expect(() => validateFields(mockSchema, ['stat_block.damage'])).not.toThrow();
  });

  test('validateFields rejects invalid field paths', () => {
    expect(() => validateFields(mockSchema, ['invalid_field'])).toThrow(
      'Invalid field: invalid_field'
    );
  });

  test('validateFields rejects partially invalid field paths', () => {
    expect(() => validateFields(mockSchema, ['name', 'invalid'])).toThrow('Invalid field: invalid');
  });
});
