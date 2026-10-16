import { describe, expect, test } from 'bun:test';
import { formatDuration } from './format';

describe('formatDuration', () => {
	test('formats minutes and zero-padded seconds', () => {
		expect(formatDuration(65_000)).toBe('1:05');
		expect(formatDuration(7 * 60_000)).toBe('7:00');
	});

	test('rounds to the nearest second', () => {
		expect(formatDuration(150_400)).toBe('2:30');
		expect(formatDuration(150_500)).toBe('2:31');
	});

	test('does not wrap minutes past an hour', () => {
		expect(formatDuration(3_600_000)).toBe('60:00');
	});
});
