import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-auto';
import { defineConfig } from 'vite';

export default defineConfig({
	// Expose PUBLIC_* variables from .env to the client as import.meta.env.PUBLIC_*.
	envPrefix: 'PUBLIC_',
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	// Spotify only accepts loopback redirect URIs with 127.0.0.1 (not "localhost").
	server: {
		host: '127.0.0.1',
		port: 5173,
		strictPort: true
	}
});
