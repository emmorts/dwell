import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findForeignUrls, PUBLIC_REGISTRY, rebase } from './mirror-lock';

const MIRROR = 'https://jfrog.example.com/artifactory/api/npm/npm/';
// Bun has been seen to write the explicit default port into lockfiles.
const MIRROR_WITH_PORT = 'https://jfrog.example.com:443/artifactory/api/npm/npm/';

function entry(base: string, name: string, version: string): string {
	const file = `${name.split('/').pop()}-${version}.tgz`;
	return `    "${name}": ["${name}@${version}", "${base}${name}/-/${file}", {}, "sha512-AAAA=="],`;
}

const publicLock = [
	'{',
	'  "packages": {',
	entry(PUBLIC_REGISTRY, 'ms', '2.1.3'),
	entry(PUBLIC_REGISTRY, '@sveltejs/kit', '3.0.1'),
	'  },',
	'}'
].join('\n');

describe('rebase', () => {
	test('moves unscoped and scoped tarballs to a mirror', () => {
		const out = rebase(publicLock, MIRROR);
		expect(out).toContain(`"${MIRROR}ms/-/ms-2.1.3.tgz"`);
		expect(out).toContain(`"${MIRROR}@sveltejs/kit/-/kit-3.0.1.tgz"`);
		expect(out).not.toContain('registry.npmjs.org');
	});

	test('moves a mirror with an explicit :443 port back to public', () => {
		const mirrored = rebase(publicLock, MIRROR_WITH_PORT);
		expect(rebase(mirrored, PUBLIC_REGISTRY)).toBe(publicLock);
	});

	test('round-trips public -> mirror -> public byte for byte', () => {
		expect(rebase(rebase(publicLock, MIRROR), PUBLIC_REGISTRY)).toBe(publicLock);
	});

	test('is idempotent in both directions', () => {
		const once = rebase(publicLock, MIRROR);
		expect(rebase(once, MIRROR)).toBe(once);
		expect(rebase(publicLock, PUBLIC_REGISTRY)).toBe(publicLock);
	});

	test('normalises a registry without a trailing slash', () => {
		expect(rebase(publicLock, MIRROR.slice(0, -1))).toBe(rebase(publicLock, MIRROR));
	});

	test('leaves non-tarball URLs and surrounding text untouched', () => {
		const text = '  "homepage": "https://example.com/docs/lock",';
		expect(rebase(text, MIRROR)).toBe(text);
	});

	test('does not rewrite strings that merely contain a registry-like host', () => {
		const lookalike = '  "note": "see https://registry.npmjs.org.evil.test/x/-/x-1.0.0.tgz",';
		expect(rebase(lookalike, MIRROR)).toBe(lookalike);
	});
});

describe('findForeignUrls', () => {
	test('is empty for a public lockfile', () => {
		expect(findForeignUrls(publicLock)).toEqual([]);
	});

	test('flags mirror URLs, with or without the explicit port', () => {
		expect(findForeignUrls(rebase(publicLock, MIRROR)).length).toBeGreaterThan(0);
		expect(findForeignUrls(rebase(publicLock, MIRROR_WITH_PORT)).length).toBeGreaterThan(0);
	});

	test('flags a look-alike host that only shares the public prefix', () => {
		expect(findForeignUrls('"https://registry.npmjs.org.evil.test/a"')).toEqual([
			'https://registry.npmjs.org.evil.test/a'
		]);
	});
});

describe('the repository lockfile', () => {
	const lock = readFileSync(join(import.meta.dir, '..', 'bun.lock'), 'utf8');

	test('uses only public registry URLs', () => {
		expect(findForeignUrls(lock)).toEqual([]);
	});

	test('round-trips through a mirror without any change', () => {
		expect(rebase(rebase(lock, MIRROR_WITH_PORT), PUBLIC_REGISTRY)).toBe(lock);
	});
});
