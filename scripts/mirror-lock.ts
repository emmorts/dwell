/**
 * Pure transforms for bun.lock registry URLs. No I/O here, so the rules are unit-tested
 * in mirror-lock.test.ts.
 *
 * Bun records each package's tarball URL as a quoted string of the form
 *   "<registry base>/<name or @scope/name>/-/<file>.tgz"
 * Only those strings are rewritten. Every other byte of the lockfile is left alone.
 */

export const PUBLIC_REGISTRY = 'https://registry.npmjs.org/';

// A quoted npm tarball URL. The lazy base group stops at the last "/<name>/-/<file>.tgz",
// so scoped names ("@scope/name") and mirror paths with ports or sub-paths both match.
const TARBALL = /"(https?:\/\/[^"\s]+?)\/((?:@[^/"\s]+\/)?[^/"\s]+)\/-\/([^/"\s]+\.tgz)"/g;

// Any URL at all, used by the guard so that no mirror reference can slip through unnoticed.
const ANY_URL = /https?:\/\/[^"\s]+/g;

/** Registry URLs always end in a slash, so the prefix checks below cannot match look-alike hosts. */
export function normalizeRegistry(url: string): string {
	const trimmed = url.trim();
	return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/** Points every npm tarball URL in a lockfile at `registry`. */
export function rebase(lock: string, registry: string): string {
	const base = normalizeRegistry(registry);
	return lock.replace(
		TARBALL,
		(_match, _base: string, pkg: string, file: string) => `"${base}${pkg}/-/${file}"`
	);
}

/** Every URL in the lockfile that is not under the public registry. Empty means publicly installable. */
export function findForeignUrls(lock: string): string[] {
	const found = new Set<string>();
	for (const match of lock.matchAll(ANY_URL)) {
		if (!match[0].startsWith(PUBLIC_REGISTRY)) found.add(match[0]);
	}
	return [...found];
}
