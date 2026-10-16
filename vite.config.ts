import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
	// Expose PUBLIC_* variables from .env to the client as import.meta.env.PUBLIC_*.
	envPrefix: 'PUBLIC_',
	resolve: {
		// Keep in sync with "paths" in tsconfig.json.
		alias: [{ find: /^#lib\//, replacement: fileURLToPath(new URL('./src/lib/', import.meta.url)) }]
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static SPA output. Workers serves /index.html for unmatched paths
			// (single-page-application mode), so the fallback must be index.html.
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	// Spotify only accepts loopback redirect URIs with 127.0.0.1 (not "localhost").
	server: {
		host: '127.0.0.1',
		port: 5173,
		strictPort: true
	}
});
