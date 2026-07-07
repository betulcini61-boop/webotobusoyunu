import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // GitHub Pages / statik hosting için SPA fallback
			precompress: false,
			strict: true
		}),
		paths: {
			// GitHub Pages'te "kullanici.github.io/repo-adi" altında yayınlarsan
			// bu değeri '/repo-adi' yap. Kök domainde (ör. Vercel/Netlify) boş bırak.
			base: process.env.BASE_PATH || ''
		}
	}
};

export default config;
