// Tests dans Chrome sur un diaporama de test, indépendant du vrai contenu (content/slides.ts) :
// chaque type de slide et chaque comportement reste couvert, même s'il disparaît du vrai déroulé.
// L'app compilée (dist/) est copiée et son contenu remplacé par FIXTURE.
// Lancer : npm run build && npm run test:e2e
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { Browser, SCREEN, type Page, type Point } from '../../src/kit/node/chrome.ts';
import { startStaticServer, type StaticServer } from '../../src/kit/node/static-server.ts';
import { checkSlides, type Slide } from '../../src/logic/slides.ts';
import {
	current, doneMessage, expectSlide, isBlack, isMenuOpen, jumpTo, LEFT, mouseClick, openApp, OVERFLOWING, percent,
	POSITION_KEY, pressKey, RIGHT, SETTINGS_KEY, swipe, TEST_TIMEOUT, text, turnPhone,
} from './helpers.ts';

/** Durée des chargements du diaporama de test, en secondes : courte pour des tests rapides. */
const LOAD_S = 2;
const LOAD_MS = LOAD_S * 1000;
/** Chargement terminé, pause à 100 % comprise (logic/loading.ts), avec une marge. */
const LOAD_DONE_MS = LOAD_MS + 1500;

const FIXTURE: Slide[] = [
	/* 0 */ { titre: 'Début', note: 'Note de la première slide' },
	/* 1 */ { titre: 'Sans note' },
	/* 2 */ { titre: 'Bouton seul', bouton: 'Suivant' },
	/* 3 */ { titre: 'Bouton et chargement', bouton: 'Lancer', chargement: LOAD_S },
	/* 4 */ { titre: 'Chargement automatique', chargement: LOAD_S },
	/* 5 */ { titre: 'Chargement et message', chargement: LOAD_S, termine: '**Terminé**' },
	/* 6 */ { etiquette: 'Résultat', grand: '42', texte: 'cartes' },
	/* 7 */ { etiquette: 'Résultat', image: 'images/logo.svg', texte: 'Image et texte' },
	/* 8 */ { texte: 'Un texte très long. '.repeat(60) },
	/* 9 */ { titre: 'Fin', bouton: 'Recommencer', boutonVers: 1 },
];
const COUNT = FIXTURE.length;
const BUTTON_ONLY = 2;
const BUTTON_LOADING = 3;
const AUTO_LOADING = 4;
const MESSAGE = 5;
const LABEL_BIG = 6;
const LABEL_IMAGE = 7;
const LONG_TEXT = 8;

/** Point à droite de l'écran, loin des boutons des slides. */
const FAR_RIGHT: Point = { x: SCREEN.width - 20, y: SCREEN.height - 140 };

let dir: string;
let server: StaticServer;
let browser: Browser;

before(async () => {
	if (!existsSync('dist/index.html')) throw new Error('dist/ absent : lancez « npm run build » avant les tests dans Chrome.');
	assert.deepEqual(checkSlides(FIXTURE, (path) => existsSync(join('public', path))), [], 'diaporama de test valide');
	dir = mkdtempSync(join(tmpdir(), 'analyseur-q-fixture-'));
	cpSync('dist', dir, { recursive: true });
	writeFileSync(join(dir, 'content', 'slides.js'), `export const SLIDES = ${JSON.stringify(FIXTURE)};\n`);
	server = await startStaticServer(dir, 0);
	browser = await Browser.launch();
});

after(async () => {
	await browser?.close();
	await server?.close();
	if (dir) rmSync(dir, { recursive: true, force: true });
});

const withFixture = (storage: Record<string, string>, run: (page: Page) => Promise<void>): Promise<void> =>
	openApp(browser, server.url, COUNT, storage, run);

/** État du bouton et de la barre de la slide courante. */
const ACTIONS = `(() => { const s = document.querySelector('.slide.current'); const b = s.querySelector('.bouton'); const c = s.querySelector('.chargement'); return { button: b ? !b.hidden : null, bar: c ? !c.hidden : null }; })()`;
const actions = (page: Page): Promise<{ button: boolean | null; bar: boolean | null }> => page.evaluate(ACTIONS);

/** Centre du bouton de la slide courante, en coordonnées de l'écran. */
const buttonCenter = (page: Page): Promise<Point> =>
	page.evaluate(`(() => { const r = document.querySelector('.slide.current .bouton').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);

/* ================= Aides à l'écran ================= */

test('notes, compteur et barre de progression suivent la slide ; notes masquables', TEST_TIMEOUT, async () => {
	const progress = `document.querySelector('#progress-bar').style.transform`;
	await withFixture({}, async (page) => {
		assert.equal(await text(page, '#counter'), `1 / ${COUNT}`);
		assert.equal(await page.evaluate(progress), 'scaleX(0)');
		assert.equal(await page.evaluate(`document.querySelector('#note').hidden`), false);
		assert.equal(await text(page, '#note'), 'Note de la première slide');

		await jumpTo(page, 1);
		assert.equal(await page.evaluate(`document.querySelector('#note').hidden`), true, 'slide sans note : note cachée');
		assert.equal(await text(page, '#counter'), `2 / ${COUNT}`);

		await jumpTo(page, COUNT - 1);
		assert.equal(await page.evaluate(progress), 'scaleX(1)');
		assert.equal(await text(page, '#counter'), `${COUNT} / ${COUNT}`);
	});
	await withFixture({ [SETTINGS_KEY]: JSON.stringify({ showNotes: false }) }, async (page) => {
		assert.equal(await page.evaluate(`document.querySelector('#note').hidden`), true, 'notes masquées dans le menu');
	});
});

test('transition « aucune » : la nouvelle slide est affichée sans animation', TEST_TIMEOUT, async () => {
	await withFixture({ [SETTINGS_KEY]: JSON.stringify({ transition: 'aucune' }) }, async (page) => {
		await page.tap(RIGHT);
		await expectSlide(page, 1);
		assert.equal(await page.evaluate(`document.getAnimations().filter((a) => a.effect.target.classList?.contains('slide')).length`), 0);
		assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.slide.current')).opacity`), '1');
	});
});

/* ================= Bouton ================= */

test('bouton seul : la slide attend, l’appui passe une seule slide', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(BUTTON_ONLY) }, async (page) => {
		await sleep(800);
		assert.equal(await current(page), BUTTON_ONLY);
		await page.tap(await buttonCenter(page));
		await expectSlide(page, BUTTON_ONLY + 1);
		await sleep(400);
		assert.equal(await current(page), BUTTON_ONLY + 1, 'un seul changement de slide');
	});
});

test('bouton et chargement : la barre attend l’appui, puis passe à la suite', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(BUTTON_LOADING) }, async (page) => {
		await sleep(LOAD_DONE_MS);
		assert.deepEqual(await actions(page), { button: true, bar: false }, 'rien ne démarre sans appui');
		assert.equal(await current(page), BUTTON_LOADING);

		await page.tap(await buttonCenter(page));
		await page.waitFor(`${ACTIONS}.bar && !${ACTIONS}.button`, 'barre affichée à l\'appui', 2000, ACTIONS);
		assert.equal(await current(page), BUTTON_LOADING, 'l\'appui ne saute pas la slide');
		await page.waitFor(`${ACTIONS}.bar && document.querySelector('.slide.current .chargement-pourcent').textContent !== '0 %'`, 'barre qui avance', 2000);
		await expectSlide(page, BUTTON_LOADING + 1, LOAD_DONE_MS);
	});
});

test('bouton et chargement : tap à droite, glissement et télécommande lancent la barre sans sauter la slide ; revenir remet le bouton', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(BUTTON_LOADING) }, async (page) => {
		const launchers: [string, () => Promise<void>][] = [
			['tap à droite', () => page.tap(FAR_RIGHT)],
			['glissement vers la gauche', () => swipe(page, { x: 330, y: 760 }, { x: 150, y: 770 })],
			['télécommande', () => pressKey(page, 'PageDown')],
		];
		for (const [label, launch] of launchers) {
			assert.deepEqual(await actions(page), { button: true, bar: false }, `${label} : bouton remis`);
			await launch();
			await page.waitFor(`${ACTIONS}.bar && !${ACTIONS}.button`, `${label} : barre lancée`, 2000, ACTIONS);
			assert.equal(await current(page), BUTTON_LOADING, `${label} : slide non sautée`);
			// Quitter puis revenir : bouton affiché, barre cachée et remise à zéro.
			await pressKey(page, 'ArrowLeft');
			await expectSlide(page, BUTTON_LOADING - 1);
			await sleep(LOAD_DONE_MS);
			assert.equal(await current(page), BUTTON_LOADING - 1, `${label} : barre arrêtée en quittant la slide`);
			await jumpTo(page, BUTTON_LOADING);
		}
	});
});

test('bouton : appui juste après l’arrivée sur la slide, pendant le fondu, même si la slide précédente avait un bouton au même endroit', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(BUTTON_LOADING) }, async (page) => {
		await sleep(600);
		const center = await buttonCenter(page);
		await jumpTo(page, BUTTON_ONLY);
		await page.tap(center); // aussitôt : la slide précédente est encore en train de disparaître
		await expectSlide(page, BUTTON_ONLY + 1);
		assert.deepEqual(await actions(page), { button: true, bar: false }, 'arrivée sur la slide bouton et chargement, bouton remis');
	});
});

test('bouton Recommencer (boutonVers) : l’appui revient à la première slide ; tap à droite, glissement et télécommande ne recommencent pas', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(COUNT - 1) }, async (page) => {
		await page.tap(FAR_RIGHT);
		await swipe(page, { x: 330, y: 760 }, { x: 150, y: 770 });
		await pressKey(page, 'PageDown');
		await sleep(400);
		assert.equal(await current(page), COUNT - 1, 'pas de retour au début par erreur');
		assert.deepEqual(await actions(page), { button: true, bar: null });

		await page.tap(await buttonCenter(page));
		await expectSlide(page, 0);
		await sleep(400);
		assert.equal(await current(page), 0);
		assert.equal(await page.evaluate(`localStorage.getItem('${POSITION_KEY}')`), '0', 'position enregistrée');
	});
});

test('bouton : téléphone tourné, l’appui sur le bouton fonctionne', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(BUTTON_ONLY) }, async (page) => {
		for (const angle of [90, 270] as const) {
			await turnPhone(page, angle);
			await jumpTo(page, BUTTON_ONLY);
			await sleep(300);
			await page.tap(await buttonCenter(page));
			await expectSlide(page, BUTTON_ONLY + 1);
		}
		await turnPhone(page, 0);
	});
});

/* ================= Chargement ================= */

test('chargement automatique : démarre à l’arrivée et passe seul à la suite', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(AUTO_LOADING) }, async (page) => {
		assert.deepEqual(await actions(page), { button: null, bar: true });
		await sleep(LOAD_MS / 2);
		const middle = await percent(page);
		assert.ok(middle > 0 && middle < 100, `en cours (reçu ${middle} %)`);
		await expectSlide(page, AUTO_LOADING + 1, LOAD_DONE_MS);
	});
});

test('chargement avec message : à 100 %, le message s’affiche et la slide reste ; revenir le cache et relance la barre', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(MESSAGE) }, async (page) => {
		assert.equal(await page.evaluate(doneMessage), null);
		await page.waitFor(`${doneMessage} === 'Terminé'`, 'message à 100 %', LOAD_DONE_MS, doneMessage);
		assert.equal(await percent(page), 100);
		assert.equal(await page.evaluate(`document.querySelector('.slide.current .chargement-termine strong')?.textContent`), 'Terminé', 'mise en valeur du message');
		await sleep(1500);
		assert.equal(await current(page), MESSAGE, 'la slide reste');

		await jumpTo(page, MESSAGE + 1);
		await jumpTo(page, MESSAGE);
		assert.equal(await page.evaluate(doneMessage), null, 'message caché au retour');
		assert.ok(await percent(page) < 30, 'barre relancée depuis le début');
	});
});

test('chargement zappé : passer à la suite pendant la barre ne fait pas revenir en arrière ensuite', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(AUTO_LOADING) }, async (page) => {
		await sleep(LOAD_MS / 4);
		await page.tap(FAR_RIGHT);
		await expectSlide(page, AUTO_LOADING + 1);
		await page.tap(FAR_RIGHT);
		await expectSlide(page, AUTO_LOADING + 2);
		await sleep(LOAD_DONE_MS);
		assert.equal(await current(page), AUTO_LOADING + 2, 'aucune avance tardive de l\'ancienne barre');
	});
});

test('chargement : en pause sur écran noir, repart quand l’écran se rallume', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(AUTO_LOADING) }, async (page) => {
		await sleep(LOAD_MS / 3);
		await pressKey(page, 'b');
		assert.equal(await page.evaluate(isBlack), true);
		const paused = await percent(page);
		await sleep(LOAD_DONE_MS);
		assert.equal(await current(page), AUTO_LOADING, 'pas de changement de slide sur écran noir');
		assert.equal(await percent(page), paused, 'barre arrêtée');
		await pressKey(page, 'b');
		assert.equal(await page.evaluate(isBlack), false);
		await expectSlide(page, AUTO_LOADING + 1, LOAD_DONE_MS);
	});
});

test('chargement : aller à une autre slide par le menu l’arrête', TEST_TIMEOUT, async () => {
	await withFixture({ [POSITION_KEY]: String(AUTO_LOADING) }, async (page) => {
		await sleep(LOAD_MS / 4);
		await jumpTo(page, LONG_TEXT);
		await sleep(LOAD_DONE_MS);
		assert.equal(await current(page), LONG_TEXT);
	});
});

/* ================= Mise en page ================= */

test('étiquette, grand nombre, image et texte long : tout tient, étiquettes au même endroit', TEST_TIMEOUT, async () => {
	const labelTop = `Math.round(document.querySelector('.slide.current .etiquette').getBoundingClientRect().top)`;
	await withFixture({ [POSITION_KEY]: String(LABEL_BIG) }, async (page) => {
		assert.equal(await text(page, '.slide.current .grand'), '42');
		const top = await page.evaluate<number>(labelTop);
		assert.deepEqual(await page.evaluate(OVERFLOWING), []);

		await jumpTo(page, LABEL_IMAGE);
		await page.waitFor(`(() => { const img = document.querySelector('.slide.current .image'); return img.complete && img.naturalWidth > 0; })()`, 'image chargée');
		await sleep(600);
		assert.equal(await page.evaluate<number>(labelTop), top, 'étiquette au même endroit');
		assert.deepEqual(await page.evaluate(OVERFLOWING), []);

		await jumpTo(page, LONG_TEXT);
		const fit = await page.evaluate<number>(`Number(document.querySelector('.slide.current').style.getPropertyValue('--fit'))`);
		assert.ok(fit > 0 && fit < 1, `texte long rétréci (échelle ${fit})`);
		assert.deepEqual(await page.evaluate(OVERFLOWING), []);
	});
});

/* ================= Gestes et touches ================= */

test('souris (répétition sur ordinateur) : clic à droite suivante, à gauche précédente, clic droit rien, appui de 3 s menu', TEST_TIMEOUT, async () => {
	await withFixture({}, async (page) => {
		await mouseClick(page, RIGHT);
		await expectSlide(page, 1);
		await mouseClick(page, LEFT);
		await expectSlide(page, 0);
		await mouseClick(page, RIGHT, 'right');
		await sleep(300);
		assert.equal(await current(page), 0, 'clic droit ignoré');

		await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...RIGHT, button: 'left', clickCount: 1 });
		await page.waitFor(isMenuOpen, 'menu ouvert par un appui de 3 s à la souris', 4500);
		await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...RIGHT, button: 'left', clickCount: 1 });
		await sleep(300);
		assert.equal(await current(page), 0);
	});
});

test('clavier : Espace, Entrée, Retour arrière, flèches haut et bas ; raccourcis avec Cmd, Ctrl ou Alt ignorés ; « . » écran noir', TEST_TIMEOUT, async () => {
	await withFixture({}, async (page) => {
		for (const [key, expected] of [[' ', 1], ['Enter', 2], ['Backspace', 1], ['ArrowDown', 2], ['ArrowUp', 1]] as const) {
			await pressKey(page, key);
			await expectSlide(page, expected);
		}
		for (const modifier of [1, 2, 4]) {
			await pressKey(page, 'ArrowRight', modifier);
			await pressKey(page, 'm', modifier);
		}
		await sleep(200);
		assert.equal(await current(page), 1, 'raccourcis ignorés');
		assert.equal(await page.evaluate(isMenuOpen), false);

		await pressKey(page, '.');
		assert.equal(await page.evaluate(isBlack), true);
		await pressKey(page, '.');
		assert.equal(await page.evaluate(isBlack), false, 'la même touche rallume');
		await pressKey(page, 'B');
		await jumpTo(page, 6);
		assert.equal(await page.evaluate(isBlack), false, 'aller à une slide par le menu rallume l\'écran');
	});
});

test('jauge de l’appui long : jamais pendant un tap, visible sous le doigt pendant un appui', TEST_TIMEOUT, async () => {
	const ring = `(() => { const r = document.querySelector('#hold-ring'); return { shown: !r.hidden && getComputedStyle(r).opacity !== '0', left: r.style.left, top: r.style.top }; })()`;
	await withFixture({}, async (page) => {
		await page.touchStart(RIGHT);
		await sleep(400);
		assert.equal((await page.evaluate<{ shown: boolean }>(ring)).shown, false, 'pas de jauge pendant un tap');
		await page.touchEnd();
		await expectSlide(page, 1);

		const point = { x: 200, y: 600 };
		await page.touchStart(point);
		await page.waitFor(`${ring}.shown`, 'jauge visible pendant l\'appui', 2000, ring);
		const shown = await page.evaluate<{ left: string; top: string }>(ring);
		assert.deepEqual([shown.left, shown.top], [`${point.x}px`, `${point.y}px`], 'jauge sous le doigt');
		await page.touchEnd();
		assert.equal((await page.evaluate<{ shown: boolean }>(ring)).shown, false, 'jauge cachée au relâchement');
	});
});

test('appui long : un doigt qui glisse franchement l’annule (ni menu ni changement de slide)', TEST_TIMEOUT, async () => {
	await withFixture({}, async (page) => {
		await page.touchStart({ x: 200, y: 300 });
		await sleep(1000);
		await page.touchMove({ x: 200, y: 380 });
		await sleep(3000);
		assert.equal(await page.evaluate(isMenuOpen), false);
		await page.touchEnd();
		await sleep(300);
		assert.equal(await current(page), 0);
	});
});

test('toucher interrompu par le système (appel, notification) : ni changement de slide ni menu', TEST_TIMEOUT, async () => {
	const cancel = (page: Page): Promise<unknown> => page.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
	await withFixture({}, async (page) => {
		await page.touchStart(RIGHT);
		await sleep(80);
		await cancel(page);
		await sleep(300);
		assert.equal(await current(page), 0, 'tap interrompu');

		await page.touchStart(RIGHT);
		await sleep(1500);
		await cancel(page);
		await sleep(2500);
		assert.equal(await page.evaluate(isMenuOpen), false, 'appui long interrompu');
		// Les gestes suivants fonctionnent normalement.
		await page.tap(RIGHT);
		await expectSlide(page, 1);
	});
});
