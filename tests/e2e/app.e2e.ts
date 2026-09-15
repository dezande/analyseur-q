// Tests de bout en bout : l'app compilée (dist/) dans un vrai Chrome sans interface,
// sur un écran de téléphone, pilotée par de vrais événements tactiles et clavier.
// Lancer : npm run build && npm run test:e2e
//
// Ce qui reste à vérifier sur un vrai téléphone : l'écran toujours allumé, le ressenti des gestes
// et l'installation sur l'écran d'accueil.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { startStaticServer, type StaticServer } from '../../scripts/static-server.ts';
import { SLIDES } from '../../src/content/slides.ts';
import { Browser, SCREEN, type Page, type Point } from './chrome.ts';

/** Clés d'enregistrement (src/settings/store.ts). */
const SETTINGS_KEY = 'rain-man:settings:v1';
const POSITION_KEY = 'rain-man:position:v1';
const TEST_TIMEOUT = { timeout: 60_000 };
const COUNT = SLIDES.length;

const RIGHT: Point = { x: SCREEN.width - 80, y: SCREEN.height / 2 };
const LEFT: Point = { x: 50, y: SCREEN.height / 2 };
const CENTER: Point = { x: SCREEN.width / 2, y: SCREEN.height / 2 };

let server: StaticServer;
let browser: Browser;

before(async () => {
	if (!existsSync('dist/index.html')) throw new Error('dist/ absent : lancez « npm run build » avant les tests dans Chrome.');
	if (COUNT < 3) throw new Error('Ces tests ont besoin d\'au moins 3 slides.');
	server = await startStaticServer('dist', 0);
	browser = await Browser.launch();
});

after(async () => {
	await browser?.close();
	await server?.close();
});

/* ================= Outils ================= */

/**
 * Ouvre l'app dans un nouvel onglet avec `storage` déjà enregistré (clé → valeur brute),
 * lance `run`, puis vérifie qu'aucune erreur JavaScript n'a eu lieu.
 */
async function withApp(storage: Record<string, string>, run: (page: Page) => Promise<void>, url = server.url): Promise<void> {
	const page = await browser.newPage();
	try {
		await page.goto(url);
		const setup = Object.entries(storage).map(([key, value]) => `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join('');
		await page.evaluate(`localStorage.clear(); ${setup}`);
		await page.reload();
		await page.waitFor(`document.querySelectorAll('#deck .slide').length === ${COUNT}`, 'slides construites');
		await run(page);
		assert.deepEqual(page.errors, [], 'erreurs JavaScript dans la page');
	} finally {
		await page.close();
	}
}

/** Index de la slide affichée. */
const current = (page: Page): Promise<number> => page.evaluate(`Number(document.querySelector('.slide.current')?.dataset.index)`);

async function expectSlide(page: Page, index: number): Promise<void> {
	await page.waitFor(`document.querySelector('.slide.current')?.dataset.index === '${index}'`, `slide ${index + 1} affichée`, 3000, `document.querySelector('.slide.current')?.dataset.index`);
}

const isMenuOpen = `!document.querySelector('#menu').hidden`;
const isBlack = `!document.querySelector('#black').hidden`;

const click = (page: Page, selector: string): Promise<unknown> => page.evaluate(`document.querySelector('${selector}').click()`);
const text = (page: Page, selector: string): Promise<string> => page.evaluate(`document.querySelector('${selector}').textContent`);

/** Glissement d'un doigt de `from` à `to`, en `steps` étapes espacées de `stepMs`. */
async function swipe(page: Page, from: Point, to: Point, steps = 6, stepMs = 25): Promise<void> {
	await page.touchStart(from);
	for (let i = 1; i <= steps; i++) {
		await sleep(stepMs);
		await page.touchMove({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
	}
	await page.touchEnd();
}

async function pressKey(page: Page, key: string): Promise<void> {
	await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key });
	await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key });
}

/* ================= Démarrage ================= */

test('démarrage : toutes les slides, la première affichée, sans erreur JavaScript', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		assert.equal(await current(page), 0);
		assert.equal(await text(page, '#counter'), `1 / ${COUNT}`);
		assert.equal(await page.evaluate(isMenuOpen), false);
		assert.equal(await page.evaluate(`document.querySelectorAll('#slide-list button').length`), COUNT);
	});
});

test('position enregistrée : reprise après rechargement ; position abîmée : première slide', TEST_TIMEOUT, async () => {
	await withApp({ [POSITION_KEY]: '2' }, async (page) => {
		assert.equal(await current(page), 2);
		await page.tap(RIGHT);
		await expectSlide(page, 3 < COUNT ? 3 : 2);
		await page.reload();
		await page.waitFor(`document.querySelector('.slide.current')`, 'redémarrage');
		assert.equal(await current(page), 3 < COUNT ? 3 : 2);
	});
	for (const raw of ['{abîmé', '"2"', '999', '-4']) {
		await withApp({ [POSITION_KEY]: raw }, async (page) => {
			assert.equal(await current(page), raw === '999' ? COUNT - 1 : 0, raw);
		});
	}
});

/* ================= Gestes ================= */

test('tap à droite : suivante ; tap à gauche : précédente ; bloqué aux extrémités', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await page.tap(LEFT);
		await sleep(200);
		assert.equal(await current(page), 0, 'pas de retour avant la première slide');
		await page.tap(RIGHT);
		await expectSlide(page, 1);
		await page.tap(RIGHT);
		await expectSlide(page, 2);
		await page.tap(LEFT);
		await expectSlide(page, 1);
		for (let i = 0; i < COUNT + 2; i++) await page.tap(RIGHT);
		await expectSlide(page, COUNT - 1);
	});
});

test('tap humain : lent (600 ms) et qui tremble de 25 px', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await page.touchStart(RIGHT);
		await sleep(250);
		await page.touchMove({ x: RIGHT.x + 15, y: RIGHT.y - 20 });
		await sleep(350);
		await page.touchEnd();
		await expectSlide(page, 1);
	});
});

test('glisser vers la gauche : suivante ; vers la droite : précédente ; vertical : rien', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await swipe(page, { x: 300, y: 500 }, { x: 120, y: 520 });
		await expectSlide(page, 1);
		// Glissement lent, commencé sur le tiers gauche.
		await swipe(page, { x: 60, y: 400 }, { x: 260, y: 380 }, 10, 80);
		await expectSlide(page, 0);
		await swipe(page, { x: 200, y: 200 }, { x: 180, y: 600 });
		await sleep(200);
		assert.equal(await current(page), 0);
	});
});

test('appui de 3 s : menu, sans changer de slide ; appui abandonné à 1,5 s : rien', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await page.touchStart(RIGHT);
		await sleep(1500);
		await page.evaluate(`document.querySelector('#hold-ring').hidden`).then((hidden) => assert.equal(hidden, false, 'jauge visible'));
		await page.touchEnd();
		await sleep(2000);
		assert.equal(await page.evaluate(isMenuOpen), false);
		assert.equal(await current(page), 0);

		await page.touchStart({ x: RIGHT.x, y: RIGHT.y });
		await sleep(1000);
		await page.touchMove({ x: RIGHT.x + 20, y: RIGHT.y + 15 }); // le doigt bouge un peu
		await page.waitFor(isMenuOpen, 'menu ouvert par l\'appui de 3 s', 4000);
		await page.touchEnd();
		await sleep(200);
		assert.equal(await current(page), 0, 'relâcher l\'appui long ne change pas de slide');
	});
});

test('deux doigts : rien', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await page.touchStart(RIGHT);
		await page.touchStart(RIGHT, CENTER);
		await sleep(80);
		await page.touchEnd();
		await sleep(3500);
		assert.equal(await current(page), 0);
		assert.equal(await page.evaluate(isMenuOpen), false);
	});
});

/* ================= Clavier ================= */

test('clavier et télécommande : avancer, reculer, début, fin, menu, écran noir', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await pressKey(page, 'PageDown');
		await expectSlide(page, 1);
		await pressKey(page, 'ArrowLeft');
		await expectSlide(page, 0);
		await pressKey(page, 'End');
		await expectSlide(page, COUNT - 1);
		await pressKey(page, 'Home');
		await expectSlide(page, 0);

		await pressKey(page, 'b');
		assert.equal(await page.evaluate(isBlack), true);
		await page.tap(RIGHT);
		await page.waitFor(`!${isBlack}`, 'écran rallumé par un tap');
		assert.equal(await current(page), 0, 'le tap qui rallume ne change pas de slide');

		await pressKey(page, 'Escape');
		assert.equal(await page.evaluate(isMenuOpen), true);
		await pressKey(page, 'ArrowRight');
		assert.equal(await current(page), 0, 'menu ouvert : les flèches ne changent pas de slide');
		await pressKey(page, 'Escape');
		assert.equal(await page.evaluate(isMenuOpen), false);
	});
});

/* ================= Menu ================= */

test('menu : aller à une slide, recommencer', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await pressKey(page, 'm');
		await click(page, '#slide-list button[data-index="2"]');
		await expectSlide(page, 2);
		assert.equal(await page.evaluate(isMenuOpen), false);
		assert.equal(await page.evaluate(`localStorage.getItem('${POSITION_KEY}')`), '2');

		await pressKey(page, 'm');
		assert.equal(await page.evaluate(`document.querySelector('#slide-list .current').dataset.index`), '2');
		assert.equal(await text(page, '#menu-position'), `3 / ${COUNT}`);
		assert.match(await text(page, '#menu-version'), /^Version \S+$/);
		assert.doesNotMatch(await text(page, '#menu-version'), /__APP_VERSION__/);
		await click(page, '#restart-btn');
		await expectSlide(page, 0);
	});
});

test('menu : aides visuelles et transition, appliquées et enregistrées', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await pressKey(page, 'm');
		for (const id of ['show-counter', 'show-progress', 'show-notes', 'show-hold-ring']) {
			await click(page, `#${id}`);
		}
		await click(page, '[data-transition="glisse"]');
		await click(page, '#close-btn');
		assert.equal(await page.evaluate(`document.querySelector('#counter').hidden`), true);
		assert.equal(await page.evaluate(`document.querySelector('#progress').hidden`), true);
		assert.equal(await page.evaluate(`document.querySelector('#note').hidden`), true);
		assert.equal(await page.evaluate(`document.querySelector('#deck').dataset.transition`), 'glisse');

		await page.reload();
		await page.waitFor(`document.querySelector('.slide.current')`, 'redémarrage');
		assert.deepEqual(await page.evaluate(`JSON.parse(localStorage.getItem('${SETTINGS_KEY}'))`), {
			transition: 'glisse', showCounter: false, showProgress: false, showNotes: false, showHoldRing: false,
		});
		assert.equal(await page.evaluate(`document.querySelector('#counter').hidden`), true);

		// Jauge masquée : l'appui long ouvre quand même le menu.
		await page.touchStart(CENTER);
		await sleep(1500);
		assert.equal(await page.evaluate(`document.querySelector('#hold-ring').hidden`), true);
		await page.waitFor(isMenuOpen, 'menu ouvert', 4000);
		await page.touchEnd();
		await click(page, '#defaults-btn');
		assert.equal(await page.evaluate(`document.querySelector('#show-counter').checked`), true);
	});
});

test('réglages abîmés : l’app démarre avec les réglages par défaut', TEST_TIMEOUT, async () => {
	for (const raw of ['{pas du JSON', '"texte"', JSON.stringify({ transition: 'zoom', showNotes: 'oui' })]) {
		await withApp({ [SETTINGS_KEY]: raw }, async (page) => {
			assert.equal(await page.evaluate(`document.querySelector('#deck').dataset.transition`), 'fondu');
			assert.equal(await page.evaluate(`document.querySelector('#counter').hidden`), false);
		});
	}
});

/* ================= Fausse barre de chargement ================= */

/** Première slide avec un chargement (content/slides.ts), et sa durée. */
const LOADING_INDEX = SLIDES.findIndex((slide) => slide.chargement !== undefined);
const LOADING_MS = (SLIDES[LOADING_INDEX]?.chargement ?? 0) * 1000;
const LOADING_TEST = { timeout: 60_000 + LOADING_MS * 3, skip: LOADING_INDEX < 0 && 'aucune slide avec chargement' };

const percent = (page: Page): Promise<number> =>
	page.evaluate(`parseInt(document.querySelector('.slide.current .chargement-pourcent')?.textContent ?? '-1')`);

test('chargement : la barre avance, puis passe seule à la slide suivante', LOADING_TEST, async () => {
	await withApp({ [POSITION_KEY]: String(LOADING_INDEX) }, async (page) => {
		assert.equal(await current(page), LOADING_INDEX);
		await sleep(LOADING_MS / 2);
		const middle = await percent(page);
		assert.ok(middle > 0 && middle < 100, `en cours à mi-parcours (reçu ${middle} %)`);
		await page.waitFor(`document.querySelector('.slide.current')?.dataset.index === '${LOADING_INDEX + 1}'`, 'slide suivante après le chargement', LOADING_MS + 2000);
	});
});

test('chargement : en pause menu ouvert ; relancé depuis 0 en revenant sur la slide', LOADING_TEST, async () => {
	await withApp({ [POSITION_KEY]: String(LOADING_INDEX) }, async (page) => {
		await sleep(LOADING_MS / 3);
		await pressKey(page, 'm');
		const paused = await percent(page);
		await sleep(LOADING_MS);
		assert.equal(await current(page), LOADING_INDEX, 'pas de changement de slide menu ouvert');
		assert.equal(await percent(page), paused, 'barre arrêtée menu ouvert');
		await pressKey(page, 'Escape');
		await sleep(300);
		assert.ok(await percent(page) >= paused);

		// Quitter la slide arrête le chargement ; y revenir le relance depuis le début.
		await pressKey(page, 'ArrowLeft');
		await expectSlide(page, LOADING_INDEX - 1);
		await sleep(LOADING_MS);
		assert.equal(await current(page), LOADING_INDEX - 1, 'chargement arrêté en quittant la slide');
		await pressKey(page, 'ArrowRight');
		await expectSlide(page, LOADING_INDEX);
		assert.ok(await percent(page) < 20, 'relancé depuis le début');
	});
});

/* ================= Mise en page ================= */

/** Slides rendues dont le contenu sort de l'écran, avec leur échelle de texte. */
const OVERFLOWING = `[...document.querySelectorAll('.slide:not(.far)')].filter((slide) => {
	const body = slide.firstElementChild;
	const style = getComputedStyle(slide);
	const height = slide.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
	return body.scrollHeight > height + 1 || body.scrollWidth > body.clientWidth + 1;
}).map((slide) => ({ slide: Number(slide.dataset.index) + 1, fit: slide.style.getPropertyValue('--fit') }))`;

test('aucune slide ne sort de l’écran, en portrait comme en paysage', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		// Chaque slide est ajustée quand elle est rendue : on les parcourt toutes.
		const checkAll = async (orientation: string): Promise<void> => {
			await pressKey(page, 'Home');
			for (let i = 0; i < COUNT; i++) {
				await page.evaluate(`document.querySelector('#slide-list button[data-index="${i}"]').click()`);
				await expectSlide(page, i);
				assert.deepEqual(await page.evaluate(OVERFLOWING), [], `${orientation}, slide ${i + 1}`);
			}
		};
		await checkAll('portrait');
		await page.send('Emulation.setDeviceMetricsOverride', { width: SCREEN.height, height: SCREEN.width, deviceScaleFactor: 3, mobile: true });
		await sleep(300);
		await checkAll('paysage');
	});
});

test('seules la slide courante et ses voisines sont rendues', TEST_TIMEOUT, async () => {
	const rendered = `[...document.querySelectorAll('.slide:not(.far)')].map((s) => Number(s.dataset.index))`;
	await withApp({}, async (page) => {
		assert.deepEqual(await page.evaluate(rendered), [0, 1]);
		await page.tap(RIGHT);
		await expectSlide(page, 1);
		assert.deepEqual(await page.evaluate(rendered), [0, 1, 2]);
		await pressKey(page, 'End');
		await expectSlide(page, COUNT - 1);
		assert.deepEqual(await page.evaluate(rendered), [COUNT - 2, COUNT - 1]);
		assert.equal(await page.evaluate(`document.querySelectorAll('.slide.current').length`), 1);
	});
});

test('texte trop long : il rétrécit pour tenir', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		const fit = await page.evaluate<number>(`(() => {
			const slide = document.querySelector('.slide');
			// Un bloc de texte comme ceux de deck.ts, quel que soit le contenu de la slide.
			const texte = slide.querySelector('.slide-body').appendChild(document.createElement('div'));
			texte.className = 'texte';
			texte.appendChild(document.createElement('p')).textContent = 'mot '.repeat(400);
			window.dispatchEvent(new Event('resize'));
			return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(Number(slide.style.getPropertyValue('--fit'))))));
		})()`);
		assert.ok(fit > 0 && fit < 1, `échelle réduite (reçu ${fit})`);
		assert.deepEqual(await page.evaluate(OVERFLOWING), []);
	});
});

/* ================= Écran allumé ================= */

test('écran allumé : verrou demandé et vidéo muette en marche après un toucher', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		await page.tap(CENTER);
		await page.waitFor(`!document.querySelector('#keep-awake').paused`, 'vidéo muette en lecture', 5000);
		await page.waitFor(`document.querySelector('#wake-dot').className !== 'dot off'`, 'verrou actif', 5000);
		assert.match(await text(page, '#wake-text'), /verrou actif/);
		// Les deux moyens restent actifs ensemble quand l'API est disponible (iPhone avant iOS 18.4).
		if (await page.evaluate<boolean>(`document.querySelector('#wake-dot').className === 'dot lock'`)) {
			assert.equal(await text(page, '#wake-detail'), 'Screen Wake Lock API + vidéo muette en boucle');
		}
	});
});

/* ================= Hors-ligne et mises à jour ================= */

/** Copie de dist/ servie à part, où l'on « publie » ensuite une nouvelle version. */
async function withSiteCopy(run: (dir: string, site: StaticServer) => Promise<void>): Promise<void> {
	const dir = mkdtempSync(join(tmpdir(), 'rain-man-update-'));
	cpSync('dist', dir, { recursive: true });
	const site = await startStaticServer(dir, 0);
	try {
		await run(dir, site);
	} finally {
		await site.close();
		rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * Publie une nouvelle version dans la copie : numéro différent, donc empreinte et nom du cache différents
 * (voir tests/build/stamp-build.test.ts). Renvoie [ancien cache, nouveau cache].
 */
function publishNewVersion(dir: string, version: string): [string, string] {
	const sw = join(dir, 'sw.js');
	const oldCache = readFileSync(sw, 'utf8').match(/const CACHE = '([^']+)'/)?.[1] ?? '';
	const newCache = `rain-man-version${version}`;
	const build = join(dir, 'system', 'build.js');
	writeFileSync(build, readFileSync(build, 'utf8').replace(/version: '[^']*'/, `version: '${version}'`));
	writeFileSync(sw, readFileSync(sw, 'utf8').replace(oldCache, newCache));
	return [oldCache, newCache];
}

/** Attend que la page ait été rechargée (marqueur __pageAvantMiseAJour disparu) et l'app redémarrée. */
async function waitForReload(page: Page, timeoutMs = 15_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			// Pendant le rechargement, l'évaluation peut échouer : on réessaie.
			if (await page.evaluate<boolean>(`!window.__pageAvantMiseAJour && document.querySelectorAll('#deck .slide').length > 0`)) return;
		} catch {
			// Contexte de la page en cours de remplacement.
		}
		await sleep(100);
	}
	throw new Error('Attente dépassée : rechargement automatique après la mise à jour');
}

const MENU_VERSION = `document.querySelector('#menu-version').textContent`;

test('nouvelle version publiée, écran pas touché : nouveau cache, ancien supprimé, rechargement automatique', TEST_TIMEOUT, async () => {
	await withSiteCopy(async (dir, site) => {
		await withApp({}, async (page) => {
			await page.waitFor(`navigator.serviceWorker.controller`, 'service worker actif', 15_000);
			const [oldCache, newCache] = publishNewVersion(dir, '9999');
			assert.deepEqual(await page.evaluate(`caches.keys()`), [oldCache]);

			// Ce que fait l'app au retour au premier plan : chercher une mise à jour.
			await page.evaluate(`window.__pageAvantMiseAJour = true`);
			await page.evaluate(`navigator.serviceWorker.getRegistration().then((r) => r.update())`);
			await waitForReload(page);
			await pressKey(page, 'm');
			await page.waitFor(`${MENU_VERSION} === 'Version 9999'`, 'nouvelle version affichée', 5000, MENU_VERSION);
			await page.waitFor(`document.querySelector('#about-cache').textContent === ${JSON.stringify(newCache)}`, 'nouveau cache dans le menu', 5000, `document.querySelector('#about-cache').textContent`);
			assert.deepEqual(await page.evaluate(`caches.keys()`), [newCache], 'seul le nouveau cache reste');
		}, site.url);
	});
});

test('nouvelle version publiée pendant l’utilisation : pas de rechargement, nouvelle version à l’ouverture suivante', TEST_TIMEOUT, async () => {
	await withSiteCopy(async (dir, site) => {
		await withApp({}, async (page) => {
			await page.waitFor(`navigator.serviceWorker.controller`, 'service worker actif', 15_000);
			await page.tap(RIGHT); // en pleine routine
			await expectSlide(page, 1);
			await page.evaluate(`window.__pageAvantMiseAJour = true`);
			const [, newCache] = publishNewVersion(dir, '8888');
			await page.evaluate(`navigator.serviceWorker.getRegistration().then((r) => r.update())`);
			await page.waitFor(`caches.keys().then((keys) => keys.length === 1 && keys[0] === ${JSON.stringify(newCache)})`, 'nouveau cache installé', 15_000);
			await sleep(1000);
			assert.equal(await page.evaluate(`window.__pageAvantMiseAJour === true`), true, 'pas de rechargement en pleine routine');
			assert.equal(await current(page), 1);

			// Ouverture suivante : nouvelle version, à la même slide.
			await page.reload();
			await page.waitFor(`document.querySelectorAll('#deck .slide').length > 0`, 'app rouverte');
			assert.equal(await current(page), 1);
			await pressKey(page, 'm');
			await page.waitFor(`${MENU_VERSION} === 'Version 8888'`, 'nouvelle version à l’ouverture suivante', 5000, MENU_VERSION);
		}, site.url);
	});
});

test('hors-ligne : une fois ouverte, l’app redémarre serveur arrêté', TEST_TIMEOUT, async () => {
	const offlineServer = await startStaticServer('dist', 0);
	let closed = false;
	try {
		await withApp({}, async (page) => {
			await page.waitFor(`navigator.serviceWorker.controller`, 'service worker actif', 15_000);
			await offlineServer.close();
			closed = true;
			await page.reload();
			await page.waitFor(`document.querySelectorAll('#deck .slide').length === ${COUNT}`, 'app rechargée hors-ligne', 10_000);
			await page.tap(RIGHT);
			await expectSlide(page, 1);
		}, offlineServer.url);
	} finally {
		if (!closed) await offlineServer.close();
	}
});
