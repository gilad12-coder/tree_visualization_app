import { describe, expect, it } from 'vitest';

import { isVacantPosition } from './useDataProcessing';

describe('isVacantPosition', () => {
  it.each([
    [null, true],
    [undefined, true],
    ['', true],
    ['nan', true],
    ['EMP-001', false],
  ])('classifies person ID %s', (personId, expected) => {
    expect(isVacantPosition({ person_id: personId })).toBe(expected);
  });
});
