import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	optimizeDeps: {
		exclude: ['commonmeta']
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		nodePolyfills({
			include: ['events']
		})
	]
});
