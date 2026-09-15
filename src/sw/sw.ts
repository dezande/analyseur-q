/* Service worker : tout est mis en cache à l'installation, puis servi hors-ligne. */

// Script classique (pas de module) : les service workers modules ne sont pas lus partout.
const sw = self as unknown as ServiceWorkerGlobalScope;

// __BUILD_HASH__ est remplacé au build par une empreinte du contenu de l'app
// (scripts/stamp-build.ts) : chaque modification publiée renomme le cache, ce qui
// met à jour les appareils où l'app est installée.
const CACHE = 'analyseur-q-__BUILD_HASH__';
// Toutes les apps de dezande.github.io partagent le même espace de caches (même origine) :
// on ne supprime que les anciens caches de cette app, sous son nom actuel ou son ancien nom
// (rain-man), jamais ceux des autres apps (la boule de cristal…).
const OWN_CACHE_PREFIXES = ['analyseur-q-', 'rain-man-'];
// __ASSETS__ est remplacé au build par la liste de tous les fichiers de dist/ (scripts/stamp-build.ts) :
// un nouveau module ou une nouvelle image est mis en cache sans rien avoir à ajouter ici.
const ASSETS: string[] = ['__ASSETS__'];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE)
			.then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(keys
				.filter((key) => key !== CACHE && OWN_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
				.map((key) => caches.delete(key))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET' || new URL(request.url).origin !== sw.location.origin) return;

	event.respondWith((async () => {
		const cache = await caches.open(CACHE);
		const cached = await cache.match(request, { ignoreSearch: true });
		if (cached) return cached;
		if (request.mode === 'navigate') {
			const shell = await cache.match('./index.html');
			if (shell) return shell;
		}
		return fetch(request);
	})());
});
