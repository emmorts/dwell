#!/usr/bin/env bun
/**
 * Lets this repo install through a private npm mirror while bun.lock keeps public URLs.
 *
 * Bun downloads from the tarball URLs recorded in bun.lock, not from the configured
 * registry, so a mirror cannot be chosen by configuration alone. For the duration of a
 * bun command this script rewrites the tarball URLs to the registry you are configured to
 * use, runs bun, then rewrites them back to public URLs. Public mode is a no-op.
 *
 *   bun run mirror install            any bun command, e.g. install, add <pkg>, remove <pkg>
 *   bun run mirror fix                rewrite bun.lock to public URLs in place
 *   bun run mirror check [file | -]   fail unless every URL in the lockfile is public
 *   bun run mirror setup              enable the pre-commit guard (git core.hooksPath)
 */
import { findForeignUrls, normalizeRegistry, PUBLIC_REGISTRY, rebase } from './mirror-lock';

const LOCK = 'bun.lock';
// The Bun version Workers Builds installs with. bun.lock is written in that version's format.
const WORKERS_BUN = '1.2.15';

function fail(message: string): never {
	console.error(`mirror: ${message}`);
	process.exit(1);
}

async function registryFromNpmConfig(): Promise<string> {
	const proc = Bun.spawn(['npm', 'config', 'get', 'registry'], { stdout: 'pipe', stderr: 'pipe' });
	const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
	if (code !== 0 || out.trim() === '') {
		throw new Error(`could not read the npm registry (npm config get registry exited ${code})`);
	}
	return out;
}

/**
 * The registry bun will resolve against. Bun reads BUN_CONFIG_REGISTRY and .npmrc (including
 * the repo's own .npmrc), so this asks npm from the repo directory, which gives the same answer.
 */
async function effectiveRegistry(): Promise<{ url: string; source: string }> {
	const fromEnv = process.env.BUN_CONFIG_REGISTRY;
	if (fromEnv) return { url: normalizeRegistry(fromEnv), source: 'BUN_CONFIG_REGISTRY' };

	const bunfig = Bun.file('bunfig.toml');
	if ((await bunfig.exists()) && /^\s*registry\s*=/m.test(await bunfig.text())) {
		throw new Error('bunfig.toml sets a registry. Remove it so the registry comes from npm config.');
	}
	return { url: normalizeRegistry(await registryFromNpmConfig()), source: 'npm config' };
}

async function lockText(): Promise<string> {
	const file = Bun.file(LOCK);
	return (await file.exists()) ? file.text() : '';
}

async function rewriteLock(registry: string): Promise<void> {
	const file = Bun.file(LOCK);
	if (!(await file.exists())) return;
	await Bun.write(LOCK, rebase(await file.text(), registry));
}

async function runBun(args: string[]): Promise<number> {
	// Ctrl-C also reaches bun. Ignore it here so the lockfile is restored once bun exits.
	process.on('SIGINT', () => {});
	const proc = Bun.spawn([process.execPath, ...args], { stdio: ['inherit', 'inherit', 'inherit'] });
	return proc.exited;
}

async function runThroughRegistry(args: string[]): Promise<number> {
	const { url, source } = await effectiveRegistry();
	const isMirror = url !== PUBLIC_REGISTRY;
	console.log(`mirror: bun ${args.join(' ')} via ${url} (${source})`);
	if (Bun.version !== WORKERS_BUN) {
		console.warn(
			`mirror: running bun ${Bun.version}, but Workers Builds and bun.lock use ${WORKERS_BUN}. ` +
				`Use ${WORKERS_BUN} (mise.toml pins it) or bun.lock may be reformatted.`
		);
	}
	if (!isMirror) console.log('mirror: public registry, no rewrite needed');

	// Heal first: a lockfile left on mirror URLs by an interrupted run or a plain `bun add` is
	// rewritten to the registry in use, so bun never fetches from a host it cannot reach.
	await rewriteLock(url);

	let code = 1;
	try {
		code = await runBun(args);
	} finally {
		// Runs on success, failure and Ctrl-C alike. Public URLs must never be left behind.
		await rewriteLock(PUBLIC_REGISTRY);
	}

	const foreign = findForeignUrls(await lockText());
	if (foreign.length > 0) fail(`bun.lock still has non-public URL ${foreign[0]} after restore`);
	return code;
}

function report(text: string, label: string): number {
	const foreign = findForeignUrls(text);
	if (foreign.length === 0) {
		console.log(`mirror: ${label} uses only public registry URLs`);
		return 0;
	}
	console.error(`mirror: ${label} has ${foreign.length} non-public URL(s), e.g. ${foreign[0]}`);
	console.error('mirror: run `bun run mirror fix`, then stage bun.lock again.');
	return 1;
}

async function setupHooks(): Promise<number> {
	const proc = Bun.spawn(['git', 'config', 'core.hooksPath', '.githooks'], { stdout: 'inherit', stderr: 'inherit' });
	const code = await proc.exited;
	if (code === 0) console.log('mirror: pre-commit guard enabled (core.hooksPath = .githooks)');
	return code;
}

async function main(argv: string[]): Promise<number> {
	const [command, ...rest] = argv;
	switch (command) {
		case undefined:
		case 'help':
			console.log('usage: bun run mirror <install | add | remove | update | ... | fix | check [file|-] | setup>');
			return 0;
		case 'fix':
			await rewriteLock(PUBLIC_REGISTRY);
			return report(await lockText(), LOCK);
		case 'check': {
			const text = rest[0] === '-' ? await Bun.stdin.text() : await lockText();
			return report(text, rest[0] === '-' ? 'staged bun.lock' : LOCK);
		}
		case 'setup':
			return setupHooks();
		default:
			return runThroughRegistry(argv);
	}
}

if (import.meta.main) {
	process.exit(await main(process.argv.slice(2)));
}
