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
import { Browser, SCREEN, type Page, type Point } from '../../src/kit/node/chrome.ts';
import { startStaticServer, type StaticServer } from '../../src/kit/node/static-server.ts';
import { SLIDES } from '../../src/content/slides.ts';
import {
	CENTER, click, current, doneMessage, expectSlide, isBlack, isMenuOpen, LEFT, LEGACY_POSITION_KEY, LEGACY_SETTINGS_KEY, openApp,
	OVERFLOWING, percent, POSITION_KEY, pressKey, RIGHT, SETTINGS_KEY, swipe, TEST_TIMEOUT, text, turnPhone,
} from './helpers.ts';

const COUNT = SLIDES.length;

/** Première slide simple (ni bouton ni chargement) suivie d'une autre slide simple : pour tester la navigation. */
const PLAIN = SLIDES.findIndex((slide, i) => i + 1 < COUNT && [slide, SLIDES[i + 1]].every((s) => !s.bouton && s.chargement === undefined));

let server: StaticServer;
let browser: Browser;

before(async () => {
	if (!existsSync('dist/index.html')) throw new Error('dist/ absent : lancez « npm run build » avant les tests dans Chrome.');
	if (COUNT < 3) throw new Error('Ces tests ont besoin d\'au moins 3 slides.');
	if (PLAIN < 0) throw new Error('Ces tests ont besoin de deux slides simples qui se suivent (ni bouton ni chargement).');
	server = await startStaticServer('dist', 0);
	browser = await Browser.launch();
});

after(async () => {
	await browser?.close();
	await server?.close();
});

/* ================= Outils ================= */

/** Ouvre le vrai diaporama (content/slides.ts) ; voir openApp. */
const withApp = (storage: Record<string, string>, run: (page: Page) => Promise<void>, url = server.url): Promise<void> =>
	openApp(browser, url, COUNT, storage, run);

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
	await withApp({ [POSITION_KEY]: String(PLAIN) }, async (page) => {
		await page.tap(RIGHT);
		await expectSlide(page, PLAIN + 1);
		await page.tap(LEFT);
		await expectSlide(page, PLAIN);

		await pressKey(page, 'Home');
		await expectSlide(page, 0);
		await page.tap(LEFT);
		await sleep(200);
		assert.equal(await current(page), 0, 'pas de retour avant la première slide');
		await pressKey(page, 'End');
		await expectSlide(page, COUNT - 1);
		await page.tap(RIGHT);
		await sleep(200);
		assert.equal(await current(page), COUNT - 1, 'pas de retour au début après la dernière slide');
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
		await sleep(700);
		assert.equal(await page.evaluate(isMenuOpen), true, 'le doigt qui se relève ne clique pas dans le menu qui vient de s\'ouvrir');
		assert.equal(await current(page), 0, 'relâcher l\'appui long ne change pas de slide');
	});
});

test('appui de 3 s immobile : le doigt qui se relève ne clique pas dans le menu', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		for (const point of [CENTER, RIGHT, { x: SCREEN.width / 2, y: 250 }]) {
			await page.touchStart(point);
			await page.waitFor(isMenuOpen, 'menu ouvert', 5000);
			await sleep(300);
			await page.touchEnd();
			await sleep(700);
			assert.equal(await page.evaluate(isMenuOpen), true, `menu toujours ouvert (${point.x}, ${point.y})`);
			assert.equal(await current(page), 0);
			await pressKey(page, 'Escape');
		}
		// Passé ce court délai, un vrai tap dans le menu fonctionne.
		await pressKey(page, 'm');
		await page.tap({ x: SCREEN.width / 2, y: await page.evaluate<number>(`(() => { const r = document.querySelector('#slide-list button[data-index="1"]').getBoundingClientRect(); return r.top + r.height / 2; })()`) });
		await expectSlide(page, 1);
		assert.equal(await page.evaluate(isMenuOpen), false);
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
		// Informations du bas du menu : toutes remplies.
		assert.match(await text(page, '#about-version'), /^\S+ \(.+\)$/, 'version et commit');
		await page.waitFor(`document.querySelector('#about-storage').textContent !== ''`, 'état du stockage affiché');
		assert.match(await text(page, '#about-storage'), /^(persistant|non garanti|inconnu)$/);
		assert.match(await text(page, '#about-cache'), /^(inactif|analyseur-q-\S+)$/);
		assert.equal(await text(page, '#about-display'), 'navigateur');
		assert.match(await text(page, '#wake-text'), /^Écran : verrou (actif|inactif)$/);
		await click(page, '#close-btn');
		assert.equal(await page.evaluate(isMenuOpen), false, 'bouton Fermer');
		await pressKey(page, 'm');
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
		await sleep(500); // clics ignorés juste après l'appui long
		await click(page, '#defaults-btn');
		assert.equal(await page.evaluate(`document.querySelector('#show-counter').checked`), true);
	});
});

test('ancien nom du projet : réglages et position de rain-man repris', TEST_TIMEOUT, async () => {
	const legacy = { transition: 'aucune', showCounter: false, showProgress: false, showNotes: true, showHoldRing: true };
	await withApp({ [LEGACY_SETTINGS_KEY]: JSON.stringify(legacy), [LEGACY_POSITION_KEY]: '2' }, async (page) => {
		assert.equal(await current(page), 2);
		assert.equal(await page.evaluate(`document.querySelector('#deck').dataset.transition`), 'aucune');
		// Au premier changement, tout est enregistré sous les nouvelles clés.
		await page.tap(RIGHT);
		await expectSlide(page, 3);
		assert.equal(await page.evaluate(`localStorage.getItem('${POSITION_KEY}')`), '3');
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

/** Première slide qui lance un chargement dès l'arrivée (sans bouton). */
const LOADING_INDEX = SLIDES.findIndex((slide) => slide.chargement !== undefined && !slide.bouton);
const LOADING_MS = (SLIDES[LOADING_INDEX]?.chargement ?? 0) * 1000;
const LOADING_TEST = { timeout: 60_000 + LOADING_MS * 3, skip: LOADING_INDEX < 0 && 'aucune slide avec chargement' };
/** Slide de LOADING_INDEX : message à 100 % (la slide reste) ou passage automatique à la suivante. */
const LOADING_MESSAGE = SLIDES[LOADING_INDEX]?.termine;

test('chargement : la barre avance, puis à 100 % le message s’affiche (ou la slide suivante)', LOADING_TEST, async () => {
	await withApp({ [POSITION_KEY]: String(LOADING_INDEX) }, async (page) => {
		assert.equal(await current(page), LOADING_INDEX);
		await sleep(LOADING_MS / 2);
		const middle = await percent(page);
		assert.ok(middle > 0 && middle < 100, `en cours à mi-parcours (reçu ${middle} %)`);
		assert.equal(await page.evaluate(doneMessage), null, 'pas de message avant 100 %');
		if (LOADING_MESSAGE) {
			await page.waitFor(`${doneMessage} === ${JSON.stringify(LOADING_MESSAGE.replaceAll('**', ''))}`, 'message à 100 %', LOADING_MS + 2000, doneMessage);
			assert.equal(await percent(page), 100);
			await sleep(1500);
			assert.equal(await current(page), LOADING_INDEX, 'la slide reste affichée avec son message');
			await page.tap(RIGHT);
			await expectSlide(page, LOADING_INDEX + 1);
		} else {
			await page.waitFor(`document.querySelector('.slide.current')?.dataset.index === '${LOADING_INDEX + 1}'`, 'slide suivante après le chargement', LOADING_MS + 2000);
		}
	});
});

test('chargement : en pause menu ouvert ; relancé depuis 0, sans message, en revenant sur la slide', LOADING_TEST, async () => {
	await withApp({ [POSITION_KEY]: String(LOADING_INDEX) }, async (page) => {
		await sleep(LOADING_MS / 3);
		await pressKey(page, 'm');
		const paused = await percent(page);
		await sleep(LOADING_MS);
		assert.equal(await current(page), LOADING_INDEX, 'pas de changement de slide menu ouvert');
		assert.equal(await percent(page), paused, 'barre arrêtée menu ouvert');
		assert.equal(await page.evaluate(doneMessage), null, 'pas de message menu ouvert');
		await pressKey(page, 'Escape');
		await sleep(300);
		assert.ok(await percent(page) >= paused);

		// Quitter la slide arrête le chargement ; y revenir le relance depuis le début.
		await page.evaluate(`document.querySelector('#slide-list button[data-index="${LOADING_INDEX + 1}"]').click()`);
		await expectSlide(page, LOADING_INDEX + 1);
		await sleep(LOADING_MS);
		assert.equal(await current(page), LOADING_INDEX + 1, 'chargement arrêté en quittant la slide');
		await pressKey(page, 'ArrowLeft');
		await expectSlide(page, LOADING_INDEX);
		assert.ok(await percent(page) < 20, 'relancé depuis le début');
		assert.equal(await page.evaluate(doneMessage), null, 'message caché au redémarrage');
	});
});

/* ================= Bouton ================= */

/** Première slide avec un bouton seul (sans chargement) : l'appui passe à la slide suivante. */
const BUTTON_INDEX = SLIDES.findIndex((slide) => slide.bouton && slide.chargement === undefined);
const BUTTON_TEST = { ...TEST_TIMEOUT, skip: BUTTON_INDEX < 0 && 'aucune slide avec bouton' };

/** Centre et bord droit du bouton de la slide courante, en pixels. */
const buttonRect = (page: Page): Promise<{ x: number; y: number; right: number }> =>
	page.evaluate(`(() => { const r = document.querySelector('.slide.current .bouton').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, right: r.right }; })()`);

test('bouton : la slide attend l’appui, qui passe à la slide suivante (une seule)', BUTTON_TEST, async () => {
	await withApp({ [POSITION_KEY]: String(BUTTON_INDEX) }, async (page) => {
		await sleep(1500);
		assert.equal(await current(page), BUTTON_INDEX, 'la slide attend');
		const { x, y } = await buttonRect(page);
		await page.tap({ x, y });
		await expectSlide(page, BUTTON_INDEX + 1);
		await sleep(400);
		assert.equal(await current(page), BUTTON_INDEX + 1, 'un seul changement de slide pour un appui');
	});
});

test('bouton : tap juste à côté du bouton (doigt imprécis) compte comme un appui', BUTTON_TEST, async () => {
	await withApp({ [POSITION_KEY]: String(BUTTON_INDEX) }, async (page) => {
		const rect = await buttonRect(page);
		assert.equal(await page.evaluate(`document.elementFromPoint(${rect.right + 12}, ${rect.y}).className`), 'bouton', 'zone de toucher agrandie');
		await page.tap({ x: rect.right + 12, y: rect.y });
		await expectSlide(page, BUTTON_INDEX + 1);
	});
});

/* ================= Toujours en portrait ================= */

test('téléphone en paysage : l’app pivote et reste en portrait', TEST_TIMEOUT, async () => {
	await withApp({}, async (page) => {
		for (const angle of [90, 270] as const) {
			await turnPhone(page, angle);
			assert.deepEqual(await page.evaluate(`[document.querySelector('#stage').clientWidth, document.querySelector('#stage').clientHeight]`), [SCREEN.width, SCREEN.height], `angle ${angle}`);
			// L'app pivotée couvre exactement l'écran.
			assert.deepEqual(await page.evaluate(`(() => { const r = document.querySelector('#app').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })()`), [SCREEN.height, SCREEN.width]);
			assert.deepEqual(await page.evaluate(OVERFLOWING), []);
		}
		await turnPhone(page, 0);
		assert.equal(await page.evaluate(`document.querySelector('#app').style.transform`), '');
		assert.deepEqual(await page.evaluate(`[document.querySelector('#stage').clientWidth, document.querySelector('#stage').clientHeight]`), [SCREEN.width, SCREEN.height]);
	});
});

test('téléphone en paysage : taps et glissements suivent le téléphone, pas l’écran', TEST_TIMEOUT, async () => {
	const W = SCREEN.height; // largeur de l'écran en paysage
	const H = SCREEN.width;
	await withApp({ [POSITION_KEY]: String(PLAIN) }, async (page) => {
		// Vers la gauche (-90°) : la droite de l'app est en haut de l'écran, sa gauche en bas.
		await turnPhone(page, 90);
		await page.tap({ x: W / 2, y: 40 });
		await expectSlide(page, PLAIN + 1);
		await page.tap({ x: W / 2, y: H - 30 });
		await expectSlide(page, PLAIN);
		await swipe(page, { x: W / 2, y: 60 }, { x: W / 2 + 10, y: 300 }); // vers la gauche de l'app
		await expectSlide(page, PLAIN + 1);

		// Vers la droite (+90°) : la droite de l'app est en bas de l'écran.
		await turnPhone(page, 270);
		await page.tap({ x: W / 2, y: 30 });
		await expectSlide(page, PLAIN);
		await page.tap({ x: W / 2, y: H - 40 });
		await expectSlide(page, PLAIN + 1);

		// Appui long : le menu s'ouvre, et sa liste défile dans le sens du téléphone.
		await page.touchStart({ x: W / 2, y: H / 2 });
		await page.waitFor(isMenuOpen, 'menu ouvert en paysage', 4000);
		await page.touchEnd();
		// Menu plus long que l'écran, comme avec une vraie routine de dizaines de slides.
		await page.evaluate(`document.querySelector('#menu .sheet').append(Object.assign(document.createElement('div'), { style: 'height: 2000px' }))`);
		const scrollTop = `document.querySelector('#menu .sheet').scrollTop`;
		const before = await page.evaluate<number>(scrollTop);
		// +90° : le haut de l'app est à droite de l'écran ; faire défiler vers le bas = doigt vers le haut de l'app, donc vers la droite.
		await swipe(page, { x: 80, y: H / 2 }, { x: W - 60, y: H / 2 }, 12, 20);
		await sleep(400);
		const after = await page.evaluate<number>(scrollTop);
		assert.ok(after > before, `le menu a défilé (${before} → ${after}, max ${await page.evaluate(`document.querySelector('#menu .sheet').scrollHeight - document.querySelector('#menu .sheet').clientHeight`)})`);
	});
});

/* ================= Mise en page ================= */

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

test('étiquettes : au même endroit et à la même taille sur toutes les slides', TEST_TIMEOUT, async () => {
	const labelled = SLIDES.flatMap((slide, i) => (slide.etiquette ? [i] : []));
	await withApp({}, async (page) => {
		const boxes = new Set<string>();
		for (const i of labelled) {
			await page.evaluate(`document.querySelector('#slide-list button[data-index="${i}"]').click()`);
			await expectSlide(page, i);
			await sleep(600); // fin de la transition
			boxes.add(await page.evaluate<string>(`(() => { const r = document.querySelector('.slide.current .etiquette').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)].join(','); })()`));
			assert.deepEqual(await page.evaluate(OVERFLOWING), [], `slide ${i + 1} : contenu dans l'écran, sous l'étiquette`);
		}
		assert.equal(boxes.size, labelled.length > 0 ? 1 : 0, `positions : ${[...boxes].join(' | ')}`);
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
	const dir = mkdtempSync(join(tmpdir(), 'analyseur-q-update-'));
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
 * (voir tests/stamp-build.test.ts du kit). Renvoie [ancien cache, nouveau cache].
 */
function publishNewVersion(dir: string, version: string): [string, string] {
	const sw = join(dir, 'sw.js');
	const oldCache = readFileSync(sw, 'utf8').match(/const CACHE = '([^']+)'/)?.[1] ?? '';
	const newCache = `analyseur-q-version${version}`;
	const build = join(dir, 'kit', 'web', 'build.js');
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

/** Réglages différents des valeurs par défaut, pour vérifier qu'une mise à jour les conserve. */
const CUSTOM_SETTINGS = { transition: 'glisse', showCounter: false, showProgress: true, showNotes: false, showHoldRing: false };

async function expectCustomSettingsKept(page: Page): Promise<void> {
	assert.deepEqual(await page.evaluate(`JSON.parse(localStorage.getItem('${SETTINGS_KEY}'))`), CUSTOM_SETTINGS, 'réglages enregistrés conservés');
	assert.equal(await page.evaluate(`document.querySelector('#deck').dataset.transition`), 'glisse', 'réglages appliqués');
	assert.equal(await page.evaluate(`document.querySelector('#counter').hidden`), true);
}

test('nouvelle version publiée, écran pas touché : nouveau cache, ancien supprimé, rechargement automatique', TEST_TIMEOUT, async () => {
	await withSiteCopy(async (dir, site) => {
		await withApp({ [SETTINGS_KEY]: JSON.stringify(CUSTOM_SETTINGS), [POSITION_KEY]: '2' }, async (page) => {
			await page.waitFor(`navigator.serviceWorker.controller`, 'service worker actif', 15_000);
			// Même origine que les autres apps de dezande.github.io : leurs caches doivent survivre.
			await page.evaluate(`Promise.all([caches.open('voyante-autre-app'), caches.open('rain-man-ancien-nom')])`);
			const [oldCache, newCache] = publishNewVersion(dir, '9999');
			assert.deepEqual((await page.evaluate<string[]>(`caches.keys()`)).sort(), [oldCache, 'rain-man-ancien-nom', 'voyante-autre-app'].sort());

			// Ce que fait l'app au retour au premier plan : chercher une mise à jour.
			await page.evaluate(`window.__pageAvantMiseAJour = true`);
			await page.evaluate(`navigator.serviceWorker.getRegistration().then((r) => r.update())`);
			await waitForReload(page);
			await pressKey(page, 'm');
			await page.waitFor(`${MENU_VERSION} === 'Version 9999'`, 'nouvelle version affichée', 5000, MENU_VERSION);
			await page.waitFor(`document.querySelector('#about-cache').textContent === ${JSON.stringify(newCache)}`, 'nouveau cache dans le menu', 5000, `document.querySelector('#about-cache').textContent`);
			assert.deepEqual((await page.evaluate<string[]>(`caches.keys()`)).sort(), [newCache, 'voyante-autre-app'].sort(), 'nos anciens caches supprimés, celui de l’autre app intact');
			await expectCustomSettingsKept(page);
			assert.equal(await current(page), 2, 'position conservée');
		}, site.url);
	});
});

test('nouvelle version publiée pendant l’utilisation : pas de rechargement, nouvelle version à l’ouverture suivante', TEST_TIMEOUT, async () => {
	await withSiteCopy(async (dir, site) => {
		await withApp({ [SETTINGS_KEY]: JSON.stringify(CUSTOM_SETTINGS) }, async (page) => {
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
			await expectCustomSettingsKept(page);
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
			// Chaque image du diaporama s'affiche sans réseau.
			for (const [i, slide] of SLIDES.entries()) {
				if (!slide.image) continue;
				await click(page, `#slide-list button[data-index="${i}"]`);
				await expectSlide(page, i);
				await page.waitFor(`(() => { const img = document.querySelector('.slide.current .image'); return img.complete && img.naturalWidth > 0; })()`, `image de la slide ${i + 1} (${slide.image}) affichée hors-ligne`, 5000);
			}
		}, offlineServer.url);
	} finally {
		if (!closed) await offlineServer.close();
	}
});
