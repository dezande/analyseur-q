// Outils communs aux tests dans Chrome : ouverture de l'app, gestes, clavier, attentes.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { SCREEN, type Browser, type Page, type Point } from '../../src/kit/node/chrome.ts';

/** Clés d'enregistrement (src/settings/store.ts) : réglages dans localStorage, position dans sessionStorage. */
export const SETTINGS_KEY = 'analyseur-q:settings:v1';
export const POSITION_KEY = 'analyseur-q:position:v1';
/** Clés d'avant le renommage du projet (rain-man). */
export const LEGACY_SETTINGS_KEY = 'rain-man:settings:v1';
export const LEGACY_POSITION_KEY = 'rain-man:position:v1';

export const TEST_TIMEOUT = { timeout: 60_000 };

/** Points de toucher en portrait : droite (suivante), gauche (précédente), centre. */
export const RIGHT: Point = { x: SCREEN.width - 80, y: SCREEN.height / 2 };
export const LEFT: Point = { x: 50, y: SCREEN.height / 2 };
export const CENTER: Point = { x: SCREEN.width / 2, y: SCREEN.height / 2 };

/**
 * Ouvre l'app à `url` dans un nouvel onglet avec `storage` déjà enregistré (clé → valeur brute ;
 * POSITION_KEY dans sessionStorage, le reste dans localStorage), attend ses `count` slides,
 * lance `run`, puis vérifie qu'aucune erreur JavaScript n'a eu lieu.
 */
export async function openApp(browser: Browser, url: string, count: number, storage: Record<string, string>, run: (page: Page) => Promise<void>): Promise<void> {
	const page = await browser.newPage();
	try {
		await page.goto(url);
		const setup = Object.entries(storage).map(([key, value]) => `${key === POSITION_KEY ? 'sessionStorage' : 'localStorage'}.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join('');
		await page.evaluate(`localStorage.clear(); sessionStorage.clear(); ${setup}`);
		await page.reload();
		await page.waitFor(`document.querySelectorAll('#deck .slide').length === ${count}`, 'slides construites');
		await run(page);
		assert.deepEqual(page.errors, [], 'erreurs JavaScript dans la page');
	} finally {
		await page.close();
	}
}

/** Index de la slide affichée. */
export const current = (page: Page): Promise<number> => page.evaluate(`Number(document.querySelector('.slide.current')?.dataset.index)`);

export async function expectSlide(page: Page, index: number, timeoutMs = 3000): Promise<void> {
	await page.waitFor(`document.querySelector('.slide.current')?.dataset.index === '${index}'`, `slide ${index + 1} affichée`, timeoutMs, `document.querySelector('.slide.current')?.dataset.index`);
}

export const isMenuOpen = `!document.querySelector('#menu').hidden`;
export const isBlack = `!document.querySelector('#black').hidden`;

export const click = (page: Page, selector: string): Promise<unknown> => page.evaluate(`document.querySelector('${selector}').click()`);
export const text = (page: Page, selector: string): Promise<string> => page.evaluate(`document.querySelector('${selector}').textContent`);

/** Va à la slide `index` par la liste du menu (sans ouvrir le menu). */
export async function jumpTo(page: Page, index: number): Promise<void> {
	await click(page, `#slide-list button[data-index="${index}"]`);
	await expectSlide(page, index);
}

/** Glissement d'un doigt de `from` à `to`, en `steps` étapes espacées de `stepMs`. */
export async function swipe(page: Page, from: Point, to: Point, steps = 6, stepMs = 25): Promise<void> {
	await page.touchStart(from);
	for (let i = 1; i <= steps; i++) {
		await sleep(stepMs);
		await page.touchMove({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
	}
	await page.touchEnd();
}

/** Touche du clavier (ou d'une télécommande), avec d'éventuels modificateurs (1 Alt, 2 Ctrl, 4 Cmd, 8 Maj). */
export async function pressKey(page: Page, key: string, modifiers = 0): Promise<void> {
	await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, modifiers });
	await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, modifiers });
}

/** Clic de souris (bouton gauche par défaut), pour la répétition sur ordinateur. */
export async function mouseClick(page: Page, point: Point, button: 'left' | 'right' = 'left'): Promise<void> {
	await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
	await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button, clickCount: 1 });
	await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button, clickCount: 1 });
}

/** Téléphone tourné : vers la gauche (angle 90), vers la droite (angle 270), ou droit (0). */
export async function turnPhone(page: Page, angle: 0 | 90 | 270): Promise<void> {
	const landscape = angle !== 0;
	await page.send('Emulation.setDeviceMetricsOverride', {
		width: landscape ? SCREEN.height : SCREEN.width,
		height: landscape ? SCREEN.width : SCREEN.height,
		deviceScaleFactor: 3,
		mobile: true,
		screenOrientation: { type: angle === 0 ? 'portraitPrimary' : angle === 90 ? 'landscapePrimary' : 'landscapeSecondary', angle },
	});
	await page.waitFor(`document.querySelector('#app').dataset.rotation === '${angle === 0 ? 0 : angle === 90 ? -90 : 90}'`, `rotation pour l'angle ${angle}`, 3000);
}

/** Slides rendues dont le contenu sort de l'écran, avec leur échelle de texte. */
export const OVERFLOWING = `[...document.querySelectorAll('.slide:not(.far)')].filter((slide) => {
	const body = slide.firstElementChild;
	const style = getComputedStyle(slide);
	const height = slide.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
	return body.scrollHeight > height + 1 || body.scrollWidth > body.clientWidth + 1;
}).map((slide) => {
	const body = slide.firstElementChild;
	const style = getComputedStyle(slide);
	return {
		slide: Number(slide.dataset.index) + 1,
		fit: slide.style.getPropertyValue('--fit'),
		contenu: body.scrollHeight,
		place: Math.round(slide.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)),
		largeur: [body.scrollWidth, body.clientWidth],
		classes: slide.className,
	};
})`;

/** Pourcentage affiché par la barre de chargement de la slide courante (-1 sans barre). */
export const percent = (page: Page): Promise<number> =>
	page.evaluate(`parseInt(document.querySelector('.slide.current .chargement-pourcent')?.textContent ?? '-1')`);

/** Message à 100 % (champ termine) de la slide courante s'il est affiché, sinon null. */
export const doneMessage = `(() => { const m = document.querySelector('.slide.current .chargement-termine'); return m && !m.hidden ? m.textContent : null; })()`;
