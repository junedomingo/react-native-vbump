import { describe, test, expect } from '@jest/globals';
import {
  parseSemanticVersion,
  incrementSemanticVersion,
  calculateNewSemanticVersion,
  calculateNewBuildNumber,
} from '../../src/utils/version.js';

describe('Version Utilities', () => {
  describe('parseSemanticVersion', () => {
    test('parses valid semantic version', () => {
      const result = parseSemanticVersion('1.2.3');

      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    test('parses version with zeros', () => {
      const result = parseSemanticVersion('0.0.0');

      expect(result).toEqual({
        major: 0,
        minor: 0,
        patch: 0,
      });
    });

    test('parses version with large numbers', () => {
      const result = parseSemanticVersion('999.888.777');

      expect(result).toEqual({
        major: 999,
        minor: 888,
        patch: 777,
      });
    });

    test('throws error for invalid version format', () => {
      expect(() => parseSemanticVersion('1.2')).toThrow('Invalid version format: 1.2');
      expect(() => parseSemanticVersion('1.2.3.4')).toThrow('Invalid version format: 1.2.3.4');
      expect(() => parseSemanticVersion('1.2.a')).toThrow('Invalid version format: 1.2.a');
      expect(() => parseSemanticVersion('a.b.c')).toThrow('Invalid version format: a.b.c');
      expect(() => parseSemanticVersion('')).toThrow('Invalid version format: ');
      expect(() => parseSemanticVersion('1.2.3-alpha')).toThrow(
        'Invalid version format: 1.2.3-alpha'
      );
    });
  });

  describe('incrementSemanticVersion', () => {
    test('increments patch version', () => {
      const result = incrementSemanticVersion('1.2.3', 'patch');
      expect(result).toBe('1.2.4');
    });

    test('increments minor version and resets patch', () => {
      const result = incrementSemanticVersion('1.2.3', 'minor');
      expect(result).toBe('1.3.0');
    });

    test('increments major version and resets minor and patch', () => {
      const result = incrementSemanticVersion('1.2.3', 'major');
      expect(result).toBe('2.0.0');
    });

    test('handles zero versions correctly', () => {
      expect(incrementSemanticVersion('0.0.0', 'patch')).toBe('0.0.1');
      expect(incrementSemanticVersion('0.0.0', 'minor')).toBe('0.1.0');
      expect(incrementSemanticVersion('0.0.0', 'major')).toBe('1.0.0');
    });

    test('handles large numbers correctly', () => {
      expect(incrementSemanticVersion('999.888.777', 'patch')).toBe('999.888.778');
      expect(incrementSemanticVersion('999.888.777', 'minor')).toBe('999.889.0');
      expect(incrementSemanticVersion('999.888.777', 'major')).toBe('1000.0.0');
    });

    test('defaults to patch increment', () => {
      const result = incrementSemanticVersion('1.2.3');
      expect(result).toBe('1.2.4');
    });

    test('throws error for invalid increment type', () => {
      expect(() => incrementSemanticVersion('1.2.3', 'invalid')).toThrow(
        'Invalid increment type: invalid'
      );
    });

    test('throws error for invalid version format', () => {
      expect(() => incrementSemanticVersion('1.2', 'patch')).toThrow('Invalid version format: 1.2');
    });
  });

  describe('calculateNewSemanticVersion', () => {
    test('returns user-provided version when specified', () => {
      const result = calculateNewSemanticVersion('2.0.0', '1.5.0', 'patch');
      expect(result).toBe('2.0.0');
    });

    test('returns user-provided version even if not semantic', () => {
      const result = calculateNewSemanticVersion('custom-version', '1.0.0', 'patch');
      expect(result).toBe('custom-version');
    });

    test('auto-increments current version when user value is true', () => {
      const result = calculateNewSemanticVersion(true, '1.2.3', 'patch');
      expect(result).toBe('1.2.4');
    });

    test('auto-increments current version when user value is undefined', () => {
      const result = calculateNewSemanticVersion(undefined, '1.2.3', 'minor');
      expect(result).toBe('1.3.0');
    });

    test('auto-increments current version when user value is null', () => {
      const result = calculateNewSemanticVersion(null, '1.2.3', 'major');
      expect(result).toBe('2.0.0');
    });

    test('uses different increment types correctly', () => {
      expect(calculateNewSemanticVersion(true, '1.2.3', 'patch')).toBe('1.2.4');
      expect(calculateNewSemanticVersion(true, '1.2.3', 'minor')).toBe('1.3.0');
      expect(calculateNewSemanticVersion(true, '1.2.3', 'major')).toBe('2.0.0');
    });

    test('defaults to patch increment when no increment type specified', () => {
      const result = calculateNewSemanticVersion(true, '1.2.3');
      expect(result).toBe('1.2.4');
    });

    test('handles empty string user value', () => {
      const result = calculateNewSemanticVersion('', '1.2.3', 'patch');
      expect(result).toBe('1.2.4');
    });

    test('handles false user value', () => {
      const result = calculateNewSemanticVersion(false, '1.2.3', 'patch');
      expect(result).toBe('1.2.4');
    });
  });

  describe('calculateNewBuildNumber', () => {
    test('returns user-provided build number when specified', () => {
      const result = calculateNewBuildNumber('42', '10');
      expect(result).toBe(42);
    });

    test('returns user-provided build number as integer', () => {
      const result = calculateNewBuildNumber('999', '1');
      expect(result).toBe(999);
    });

    test('auto-increments current build number when user value is true', () => {
      const result = calculateNewBuildNumber(true, '25');
      expect(result).toBe(26);
    });

    test('auto-increments current build number when user value is undefined', () => {
      const result = calculateNewBuildNumber(undefined, '100');
      expect(result).toBe(101);
    });

    test('auto-increments current build number when user value is null', () => {
      const result = calculateNewBuildNumber(null, '5');
      expect(result).toBe(6);
    });

    test('handles string current value', () => {
      const result = calculateNewBuildNumber(true, '42');
      expect(result).toBe(43);
    });

    test('handles numeric current value', () => {
      const result = calculateNewBuildNumber(true, 42);
      expect(result).toBe(43);
    });

    test('handles zero current value', () => {
      const result = calculateNewBuildNumber(true, '0');
      expect(result).toBe(1);
    });

    test('handles large numbers', () => {
      const result = calculateNewBuildNumber(true, '999999');
      expect(result).toBe(1000000);
    });

    test('handles empty string user value', () => {
      const result = calculateNewBuildNumber('', '10');
      expect(result).toBe(11);
    });

    test('handles false user value', () => {
      const result = calculateNewBuildNumber(false, '10');
      expect(result).toBe(11);
    });

    test('handles user value "0"', () => {
      const result = calculateNewBuildNumber('0', '10');
      expect(result).toBe(0);
    });

    test('handles negative user values', () => {
      const result = calculateNewBuildNumber('-1', '10');
      expect(result).toBe(-1);
    });

    test('handles invalid current value gracefully', () => {
      const result = calculateNewBuildNumber(true, 'invalid');
      expect(result).toBe(NaN + 1); // This will be NaN, but it's expected behavior
    });
  });

  describe('Edge cases and error handling', () => {
    test('handles very large version numbers', () => {
      const result = parseSemanticVersion('999999999.999999999.999999999');
      expect(result).toEqual({
        major: 999999999,
        minor: 999999999,
        patch: 999999999,
      });
    });

    test('handles version strings with leading zeros', () => {
      const result = parseSemanticVersion('01.02.03');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    test('calculates correct version after multiple increments', () => {
      let version = '1.0.0';
      version = incrementSemanticVersion(version, 'patch'); // 1.0.1
      version = incrementSemanticVersion(version, 'patch'); // 1.0.2
      version = incrementSemanticVersion(version, 'minor'); // 1.1.0
      version = incrementSemanticVersion(version, 'patch'); // 1.1.1
      version = incrementSemanticVersion(version, 'major'); // 2.0.0

      expect(version).toBe('2.0.0');
    });

    test('handles mixed numeric and string inputs consistently', () => {
      expect(calculateNewBuildNumber(42, '10')).toBe(42);
      expect(calculateNewBuildNumber('42', 10)).toBe(42);
      expect(calculateNewBuildNumber('42', '10')).toBe(42);
    });
  });
});
